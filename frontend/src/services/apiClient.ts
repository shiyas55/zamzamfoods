/**
 * Zamzam Foods API Client
 *
 * Implements robust Dual-Authentication:
 *   1. Sends Authorization: Bearer <token> header from localStorage (works everywhere, including cross-subdomain & third-party cookie blocked environments).
 *   2. Sends credentials: "include" for HttpOnly cookie support.
 *
 * Token refresh flow:
 *   1. Request returns 401
 *   2. Client calls POST /auth/refresh/ with refresh token and credentials
 *   3. Server issues new access + refresh tokens
 *   4. Client updates stored tokens and retries original request
 *   5. If refresh fails → dispatch auth:logout → frontend redirects to /login
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  /** Set true to skip auto-refresh on 401 (used for the refresh call itself) */
  _skipRefresh?: boolean;
}

class ApiClient {
  private isRefreshing = false;
  private refreshSubscribers: Array<() => void> = [];

  /** Notify all queued requests that a fresh token has been set. */
  private onTokenRefreshed() {
    this.refreshSubscribers.forEach((cb) => cb());
    this.refreshSubscribers = [];
  }

  /** Queue a retry callback to be called after refresh completes. */
  private addRefreshSubscriber(cb: () => void) {
    this.refreshSubscribers.push(cb);
  }

  /**
   * Silently obtain a new access token by calling the refresh endpoint.
   */
  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('zamzam_refresh_token');
    // If there is no refresh token and no user, we are simply unauthenticated
    if (!refreshToken && !localStorage.getItem('zamzam_user')) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: refreshToken ? JSON.stringify({ refresh: refreshToken }) : undefined,
      });

      if (!response.ok) {
        // Prevent race condition: only clear if the token hasn't changed (e.g. from a fresh login)
        if (localStorage.getItem('zamzam_refresh_token') === refreshToken) {
          this.clearTokens();
          this.dispatchLogout();
        }
        return false;
      }

      const data = await response.json().catch(() => ({}));
      if (data.access) {
        this.setTokens(data.access, data.refresh || refreshToken || '');
      }
      return true;
    } catch {
      if (localStorage.getItem('zamzam_refresh_token') === refreshToken) {
        this.clearTokens();
        this.dispatchLogout();
      }
      return false;
    }
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
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((fetchOptions.headers as Record<string, string>) || {}),
    };

    // Attach Bearer token if available
    const accessToken = localStorage.getItem('zamzam_access_token');
    if (accessToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
      });
    } catch (err: unknown) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error(
          'You are currently offline. Live operations require a connection to the Zamzam server.'
        );
      }
      throw new Error('Unable to connect to the Zamzam server. Please check your connection and try again.');
    }

    // ── 401 handler: attempt token refresh then retry ──────────────────────
    if (
      response.status === 401 &&
      !_skipRefresh &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/refresh')
    ) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        const refreshed = await this.refreshAccessToken();
        this.isRefreshing = false;

        if (refreshed) {
          this.onTokenRefreshed();
          // Update authorization header with newly refreshed access token
          const freshToken = localStorage.getItem('zamzam_access_token');
          if (freshToken) {
            headers['Authorization'] = `Bearer ${freshToken}`;
          }
          response = await fetch(url, {
            ...fetchOptions,
            headers,
            credentials: 'include',
          });
        } else {
          throw new Error('Session expired. Please log in again.');
        }
      } else {
        // Another refresh is in progress — wait for it, then retry
        await new Promise<void>((resolve) => {
          this.addRefreshSubscriber(resolve);
        });
        const freshToken = localStorage.getItem('zamzam_access_token');
        if (freshToken) {
          headers['Authorization'] = `Bearer ${freshToken}`;
        }
        response = await fetch(url, {
          ...fetchOptions,
          headers,
          credentials: 'include',
        });
      }
    }

    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      let errorMessage = 'An error occurred while processing the request.';
      if (data?.error?.message) {
        errorMessage = data.error.message;
      } else if (data?.detail) {
        errorMessage = data.detail;
      } else if (typeof data === 'object') {
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
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
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
