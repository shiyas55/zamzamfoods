/**
 * Zamzam Foods API Client
 *
 * Implements robust Dual-Authentication:
 *   1. Sends Authorization: Bearer <token> header from localStorage (works everywhere, including cross-subdomain & third-party cookie blocked environments).
 *   2. Sends credentials: "include" for HttpOnly cookie support.
 *
 * Token refresh flow:
 *   1. Request returns 401
 *   2. Single-flight Promise mutex calls POST /auth/refresh/ with refresh token and credentials
 *   3. Server issues new access + refresh tokens
 *   4. Client updates stored tokens and retries original request
 *   5. If refresh fails with 401 → dispatch auth:logout → frontend redirects to /login
 */

const isTauriApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).__TAURI_INTERNALS__ ||
    (window as any).__TAURI__ ||
    window.location.protocol === 'tauri:' ||
    window.location.hostname === 'tauri.localhost'
  );
};

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
   !isTauriApp() &&
   (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '/api/v1'
    : 'https://zamzamfood.up.railway.app/api/v1');

/**
 * Fire-and-forget background ping to warm up sleeping Railway backend container on app launch.
 */
export const warmUpServer = (): void => {
  if (typeof window === 'undefined') return;
  fetch(`${API_BASE_URL}/settings/`, { method: 'GET', credentials: 'include' }).catch(() => {});
};

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  /** Set true to skip auto-refresh on 401 (used for the refresh call itself) */
  _skipRefresh?: boolean;
}

export interface RefreshResult {
  success: boolean;
  isAuthFailure: boolean;
}

class ApiClient {
  private refreshPromise: Promise<RefreshResult> | null = null;

  /**
   * Silently obtain a new access token by calling the refresh endpoint.
   * Utilizes a single-flight mutex to prevent concurrent refresh race conditions.
   * Multiple concurrent 401s coalesce into exactly ONE POST /auth/refresh/ request.
   */
  private async refreshAccessToken(): Promise<RefreshResult> {
    const refreshToken = localStorage.getItem('zamzam_refresh_token');
    // If there is no refresh token and no user, we are simply unauthenticated
    if (!refreshToken && !localStorage.getItem('zamzam_user')) {
      return { success: false, isAuthFailure: true };
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async (): Promise<RefreshResult> => {
      // Retry with progressive backoff for sleeping/cold-start Railway instances (up to 4 attempts)
      const refreshBackoffs = [800, 1500, 2500];
      const maxRefreshAttempts = refreshBackoffs.length + 1;

      for (let attempt = 1; attempt <= maxRefreshAttempts; attempt++) {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: refreshToken ? JSON.stringify({ refresh: refreshToken }) : undefined,
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            const errDetail = typeof data?.detail === 'string' ? data.detail.toLowerCase() : '';
            const isDefinitiveAuthFailure =
              response.status === 401 ||
              (response.status === 400 &&
                (errDetail.includes('token') ||
                  errDetail.includes('invalid') ||
                  errDetail.includes('expired') ||
                  errDetail.includes('blacklisted')));

            if (isDefinitiveAuthFailure) {
              const currentRt = localStorage.getItem('zamzam_refresh_token');
              if (currentRt === refreshToken) {
                this.clearTokens();
                this.dispatchLogout();
              }
              return { success: false, isAuthFailure: true };
            }

            // 500, 502, 503, 504 server cold-start issues: retry with backoff
            if (attempt < maxRefreshAttempts) {
              await new Promise((res) => setTimeout(res, refreshBackoffs[attempt - 1]));
              continue;
            }
            return { success: false, isAuthFailure: false };
          }

          const data = await response.json().catch(() => ({}));
          if (data.access) {
            this.setTokens(data.access, data.refresh || refreshToken || '');
            return { success: true, isAuthFailure: false };
          }
          return { success: false, isAuthFailure: false };
        } catch {
          if (attempt < maxRefreshAttempts) {
            await new Promise((res) => setTimeout(res, refreshBackoffs[attempt - 1]));
            continue;
          }
          return { success: false, isAuthFailure: false };
        }
      }
      return { success: false, isAuthFailure: false };
    })().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private dispatchLogout() {
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  public async request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { _skipRefresh, params, ...fetchOptions } = options;

    let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          queryParams.append(key, String(val));
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...((fetchOptions.headers as Record<string, string>) || {}),
    };

    if (!(fetchOptions.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Attach Bearer token if available
    const accessToken = localStorage.getItem('zamzam_access_token');
    if (accessToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let response: Response | null = null;
    // Progressive backoff delays for server cold starts (covers up to ~13.5s of Railway container spin-up)
    const coldStartDelays = [800, 1500, 2500, 3500, 5000];
    const maxNetworkAttempts = coldStartDelays.length + 1; // 6 attempts

    for (let attempt = 1; attempt <= maxNetworkAttempts; attempt++) {
      try {
        response = await fetch(url, {
          ...fetchOptions,
          headers,
          credentials: 'include',
        });

        // If server is cold-starting (502/503/504), wait and retry with progressive backoff
        if (response.status >= 502 && response.status <= 504 && attempt < maxNetworkAttempts) {
          await new Promise((res) => setTimeout(res, coldStartDelays[attempt - 1]));
          continue;
        }

        break;
      } catch {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          throw new Error(
            'You are currently offline. Live operations require a connection to the Zamzam server.'
          );
        }
        if (attempt < maxNetworkAttempts) {
          await new Promise((res) => setTimeout(res, coldStartDelays[attempt - 1]));
          continue;
        }
        throw new Error('Unable to connect to the Zamzam server. Please check your connection and try again.');
      }
    }

    if (!response) {
      throw new Error('Unable to connect to the Zamzam server. Please check your connection and try again.');
    }

    // ── 401 handler: attempt single-flight token refresh then retry with cold-start tolerance ───
    if (
      response.status === 401 &&
      !_skipRefresh &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/refresh')
    ) {
      const refreshResult = await this.refreshAccessToken();

      if (refreshResult.success) {
        // Update authorization header with newly refreshed access token
        const freshToken = localStorage.getItem('zamzam_access_token');
        if (freshToken) {
          headers['Authorization'] = `Bearer ${freshToken}`;
        }
        // Retry fetch with cold-start backoff (up to 3 attempts)
        let retryResponse: Response | null = null;
        for (let rAttempt = 1; rAttempt <= 3; rAttempt++) {
          try {
            retryResponse = await fetch(url, {
              ...fetchOptions,
              headers,
              credentials: 'include',
            });
            if (retryResponse.status >= 502 && retryResponse.status <= 504 && rAttempt < 3) {
              await new Promise((res) => setTimeout(res, rAttempt * 1000));
              continue;
            }
            break;
          } catch {
            if (rAttempt < 3) {
              await new Promise((res) => setTimeout(res, rAttempt * 1000));
              continue;
            }
            throw new Error('Unable to connect to the Zamzam server. Please check your connection and try again.');
          }
        }
        if (!retryResponse) {
          throw new Error('Unable to connect to the Zamzam server. Please check your connection and try again.');
        }
        response = retryResponse;
      } else if (refreshResult.isAuthFailure) {
        throw new Error('Session expired. Please log in again.');
      } else {
        throw new Error('Unable to connect to the Zamzam server. Please check your connection and try again.');
      }
    }

    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      let errorMessage = 'An error occurred while processing the request.';
      if (typeof data?.error === 'string') {
        errorMessage = data.error;
      } else if (data?.error?.message) {
        errorMessage = data.error.message;
      } else if (data?.detail) {
        errorMessage = data.detail;
      } else if (data?.message) {
        errorMessage = data.message;
      } else if (typeof data === 'object' && data !== null) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          const val = data[firstKey];
          errorMessage = Array.isArray(val) ? `${firstKey}: ${val[0]}` : `${firstKey}: ${val}`;
        }
      }
      throw new Error(errorMessage);
    }

    return data as T;
  }

  public get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  public post<T>(endpoint: string, body?: unknown) {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(endpoint, {
      method: 'POST',
      body: isForm ? (body as FormData) : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  }

  public patch<T>(endpoint: string, body?: unknown) {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: isForm ? (body as FormData) : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  }

  public delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  public setTokens(access: string, refresh?: string) {
    if (access) localStorage.setItem('zamzam_access_token', access);
    if (refresh) localStorage.setItem('zamzam_refresh_token', refresh);
  }

  public clearTokens() {
    localStorage.removeItem('zamzam_user');
    localStorage.removeItem('zamzam_access_token');
    localStorage.removeItem('zamzam_refresh_token');
  }
}

export const apiClient = new ApiClient();
