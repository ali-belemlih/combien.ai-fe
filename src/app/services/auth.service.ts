import { Injectable, signal, computed } from '@angular/core';
import Keycloak from 'keycloak-js';
import { environment } from '../../environments/environment';

export interface AuthUser {
  sub: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface LoginResult {
  success: boolean;
  error?: 'invalid_credentials' | 'network_error' | 'unknown';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _kc: Keycloak;
  private _initialized = signal(false);
  private _user = signal<AuthUser | null>(null);

  readonly initialized = this._initialized.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.roles.includes('admin') ?? false);

  constructor() {
    this._kc = new Keycloak({
      url: environment.keycloak.url,
      realm: environment.keycloak.realm,
      clientId: environment.keycloak.clientId,
    });
  }

  async init(): Promise<void> {
    try {
      const storedToken = localStorage.getItem('kc_token');
      const storedRefreshToken = localStorage.getItem('kc_refresh_token');

      const authenticated = await this._kc.init({
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        checkLoginIframe: false,
        token: storedToken ?? undefined,
        refreshToken: storedRefreshToken ?? undefined,
      });

      if (authenticated) {
        this._persistTokens();
        this._syncUser();
        this._scheduleTokenRefresh();
      } else {
        this._clearStoredTokens();
      }
    } catch (err) {
      console.error('[AuthService] Keycloak init failed:', err);
      this._clearStoredTokens();
    } finally {
      this._initialized.set(true);
    }
  }

  async loginWithCredentials(username: string, password: string): Promise<LoginResult> {
    const tokenUrl = `${environment.keycloak.url}/realms/${environment.keycloak.realm}/protocol/openid-connect/token`;

    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: environment.keycloak.clientId,
      username,
      password,
      scope: 'openid profile email',
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401 || data['error'] === 'invalid_grant') {
          return { success: false, error: 'invalid_credentials' };
        }
        return { success: false, error: 'unknown' };
      }

      const tokens = await response.json();

      (this._kc as any).token = tokens['access_token'];
      (this._kc as any).refreshToken = tokens['refresh_token'];
      (this._kc as any).idToken = tokens['id_token'];
      (this._kc as any).tokenParsed = this._parseJwt(tokens['access_token']);
      (this._kc as any).refreshTokenParsed = this._parseJwt(tokens['refresh_token']);
      (this._kc as any).authenticated = true;

      this._persistTokens();
      this._syncUser();
      this._scheduleTokenRefresh();

      return { success: true };
    } catch {
      return { success: false, error: 'network_error' };
    }
  }

  logout(): void {
    this._clearStoredTokens();
    this._user.set(null);
    this._kc.logout({ redirectUri: window.location.origin + '/login' });
  }

  async getToken(): Promise<string | null> {
    try {
      const refreshed = await this._kc.updateToken(30);
      if (refreshed) this._persistTokens();
      return this._kc.token ?? null;
    } catch {
      return null;
    }
  }

  getTokenSync(): string | null {
    return this._kc.token ?? null;
  }

  hasRole(role: string): boolean {
    return this._user()?.roles.includes(role) ?? false;
  }

  private _parseJwt(token: string): Record<string, unknown> | undefined {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return undefined;
    }
  }

  private _syncUser(): void {
    const profile = this._kc.tokenParsed;
    if (!profile) return;

    const realmRoles: string[] = profile['realm_access']?.roles ?? [];
    const clientRoles: string[] = profile['resource_access']?.[environment.keycloak.clientId]?.roles ?? [];
    const apiRoles: string[] = profile['resource_access']?.['combien-ai-api']?.roles ?? [];
    const frontendRoles: string[] = profile['resource_access']?.['combien-ai-frontend']?.roles ?? [];
    const allRoles = [...new Set([...realmRoles, ...clientRoles, ...apiRoles, ...frontendRoles])];

    this._user.set({
      sub: profile['sub'] ?? '',
      username: profile['preferred_username'] ?? '',
      email: profile['email'] ?? '',
      firstName: profile['given_name'] ?? '',
      lastName: profile['family_name'] ?? '',
      roles: allRoles,
    });
  }

  private _persistTokens(): void {
    if (this._kc.token) localStorage.setItem('kc_token', this._kc.token);
    if (this._kc.refreshToken) localStorage.setItem('kc_refresh_token', this._kc.refreshToken);
  }

  private _clearStoredTokens(): void {
    localStorage.removeItem('kc_token');
    localStorage.removeItem('kc_refresh_token');
  }

  private _scheduleTokenRefresh(): void {
    setInterval(async () => {
      try {
        const refreshed = await this._kc.updateToken(60);
        if (refreshed) {
          this._persistTokens();
          this._syncUser();
        }
      } catch {
        this._clearStoredTokens();
        this._user.set(null);
      }
    }, 60_000);
  }
}
