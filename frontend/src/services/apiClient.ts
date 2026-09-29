/**
 * Zamzam Foods API Client
 *
 * Uses credentials: "include" so that HttpOnly cookies (zamzam_access and
 * zamzam_refresh) are automatically sent with every request. The JavaScript
 * layer never reads or stores JWT tokens.
 *
 * Token refresh flow:
 *   1. Request returns 401
 *   2. Client calls POST /auth/refresh/ (cookie is sent automatically)
 *   3. Server validates refresh cookie → issues new access + refresh cookies
 *   4. Client retries the original request (new access cookie is sent)
 *   5. If refresh also fails → dispatch auth:logout → frontend redirects to /login
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

  /** Notify all queued requests that a fresh cookie has been set. */
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
   * The browser sends the zamzam_refresh cookie automatically.
   * On success, the server sets a new zamzam_access cookie automatically.
   * Returns true if refresh succeeded, false otherwise.
   */
  private async refreshAccessToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        // Refresh cookie expired or blacklisted → force re-login
        this.dispatchLogout();
        return false;
      }
      return true;
    } catch {
      this.dispatchLogout();
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

    let response: Response;
    try {
      response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include', // Always send HttpOnly cookies
      });
    } catch (err: unknown) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error(
          'You are currently offline. Live operations (payments, deliveries, expenses) require a connection to the Zamzam server.'
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
          // Retry original request — new access cookie is now set
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

  /**
   * @deprecated  Tokens are now stored in HttpOnly cookies managed by the server.
   * These stubs are kept so that any legacy code referencing them does not break.
   */
  public setTokens(_access: string, _refresh: string) {
    // No-op: tokens live in HttpOnly cookies, not JS
  }

  public clearTokens() {
    // No-op: clearing is done server-side via the logout endpoint
    localStorage.removeItem('zamzam_user');
  }
}

export const apiClient = new ApiClient();
