import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserProfile } from '../models/user.model';

/** Représentation locale de l'utilisateur extraite du JWT via digi-auth. */
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
  error?: 'invalid_credentials' | 'network_error' | 'account_disabled' | 'unknown';
  totpRequired?: boolean;
  totpSetupRequired?: boolean;
  userId?: string;
}

/** Réponse de digi-auth POST /api/auth/login */
interface DigiAuthLoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  username: string;
  roles: string[];
  totpRequired?: boolean;
  totpSetupRequired?: boolean;
  userId?: string;
}

/** Réponse de digi-auth POST /api/auth/refresh */
interface DigiAuthRefreshResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  username: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _http = inject(HttpClient);

  // ── Signals ───────────────────────────────────────────────────────────────────

  private _initialized    = signal(false);
  private _user           = signal<AuthUser | null>(null);
  private _userProfile    = signal<UserProfile | null>(null);

  /** Guard contre les appels multiples à _scheduleTokenRefresh */
  private _refreshScheduled = false;

  readonly initialized     = this._initialized.asReadonly();
  readonly user            = this._user.asReadonly();
  readonly userProfile     = this._userProfile.asReadonly();

  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isAdmin         = computed(() =>
    this._user()?.roles.some(r => r.toLowerCase() === 'admin') ?? false
  );

  readonly displayName = computed<string>(() => {
    const profile = this._userProfile();
    if (profile?.first_name || profile?.last_name) {
      return [profile.first_name, profile.last_name].filter(Boolean).join(' ');
    }
    return this._user()?.username ?? '';
  });

  readonly avatarInitial = computed<string>(() => {
    const profile = this._userProfile();
    const first = profile?.first_name ?? this._user()?.username ?? '?';
    return first.charAt(0).toUpperCase();
  });

  // ── Initialisation ────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    try {
      const storedToken = localStorage.getItem('kc_token');
      if (storedToken && this._isTokenValid(storedToken)) {
        this._syncUserFromJwt(storedToken);
        this._scheduleTokenRefresh();
        this._fetchAndSyncBackendProfile();
      } else {
        const refreshed = await this._tryRefreshToken();
        if (!refreshed) {
          this._clearStoredTokens();
        }
      }
    } catch (err) {
      console.error('[AuthService] Init failed:', err);
      this._clearStoredTokens();
    } finally {
      this._initialized.set(true);
    }
  }

  // ── Login via digi-auth ───────────────────────────────────────────────────────

  async loginWithCredentials(username: string, password: string): Promise<LoginResult> {
    try {
      const response = await fetch(`${environment.digiAuthUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, realm: environment.keycloak.realm }),
      });

      if (!response.ok) {
        if (response.status === 401) return { success: false, error: 'invalid_credentials' };
        return { success: false, error: 'unknown' };
      }

      const data: DigiAuthLoginResponse = await response.json();

      if (data.totpRequired)     return { success: false, totpRequired: true,     userId: data.userId };
      if (data.totpSetupRequired) return { success: false, totpSetupRequired: true, userId: data.userId };

      return this._finalizeLogin(data);
    } catch (err) {
      console.error('[AuthService] loginWithCredentials error:', err);
      return { success: false, error: 'network_error' };
    }
  }

  // ── TOTP : récupérer le QR code ───────────────────────────────────────────────

  async getTotpSetup(userId: string): Promise<{ secret: string; qrCodeUri: string } | null> {
    try {
      const response = await fetch(`${environment.digiAuthUrl}/api/totp/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, realm: environment.keycloak.realm }),
      });
      if (!response.ok) {
        console.error('[AuthService] getTotpSetup failed:', response.status, await response.text());
        return null;
      }
      const data = await response.json();
      return { secret: data.secret, qrCodeUri: data.qrCodeUri };
    } catch (err) {
      console.error('[AuthService] getTotpSetup network error:', err);
      return null;
    }
  }

  // ── TOTP : finaliser le setup (1ère configuration) ────────────────────────────

  async totpCompleteSetup(username: string, password: string, totpCode: string): Promise<LoginResult> {
    try {
      const response = await fetch(`${environment.digiAuthUrl}/api/auth/login/complete-totp-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, realm: environment.keycloak.realm, totpCode }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        // Message d'erreur spécifique si code invalide
        if (data['error']?.includes('invalide')) return { success: false, error: 'invalid_credentials' };
        if (response.status === 401) return { success: false, error: 'invalid_credentials' };
        return { success: false, error: 'unknown' };
      }

      const data: DigiAuthLoginResponse = await response.json();
      return this._finalizeLogin(data);
    } catch {
      return { success: false, error: 'network_error' };
    }
  }

  // ── TOTP : login avec code (2FA configuré) ────────────────────────────────────

  async totpLogin(username: string, password: string, totpCode: string): Promise<LoginResult> {
    try {
      const response = await fetch(`${environment.digiAuthUrl}/api/auth/login/totp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, realm: environment.keycloak.realm, totpCode }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('[AuthService] totpLogin failed:', response.status, errText);
        if (response.status === 401) return { success: false, error: 'invalid_credentials' };
        return { success: false, error: 'unknown' };
      }

      let data: DigiAuthLoginResponse;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.error('[AuthService] totpLogin JSON parse error:', parseErr);
        return { success: false, error: 'unknown' };
      }

      console.log('[AuthService] totpLogin success, accessToken present:', !!data.accessToken);
      return this._finalizeLogin(data);
    } catch (err) {
      console.error('[AuthService] totpLogin network error:', err);
      return { success: false, error: 'network_error' };
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────────

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('kc_refresh_token');
    if (refreshToken) {
      fetch(`${environment.digiAuthUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    this._clearStoredTokens();
    this._user.set(null);
    this._userProfile.set(null);
    window.location.href = '/login';
  }

  // ── Token ─────────────────────────────────────────────────────────────────────

  async getToken(): Promise<string | null> {
    const token = localStorage.getItem('kc_token');
    if (!token) return null;
    if (!this._isTokenValid(token, 30)) {
      const refreshed = await this._tryRefreshToken();
      if (!refreshed) return null;
      return localStorage.getItem('kc_token');
    }
    return token;
  }

  getTokenSync(): string | null {
    return localStorage.getItem('kc_token');
  }

  hasRole(role: string): boolean {
    return this._user()?.roles.includes(role) ?? false;
  }

  // ── Privé ─────────────────────────────────────────────────────────────────────

  /** Appelé après un login réussi : stocke tokens, sync user, vérifie is_active. */
  private async _finalizeLogin(data: DigiAuthLoginResponse): Promise<LoginResult> {
    this._storeTokens(data.accessToken, data.refreshToken);
    this._syncUserFromJwt(data.accessToken);
    this._scheduleTokenRefresh();

    // Sync le profil backend en arrière-plan — ne bloque PAS le login
    // Si le backend est indisponible, l'utilisateur peut quand même se connecter
    this._fetchAndSyncBackendProfile().then(profile => {
      console.log('[AuthService] Background profile sync result:', profile);
      if (profile && profile.enabled === false) {
        // Compte désactivé détecté après coup — déconnecter
        console.warn('[AuthService] Account disabled, logging out');
        this._clearStoredTokens();
        this._user.set(null);
        this._userProfile.set(null);
        window.location.href = '/login?reason=disabled';
      }
    }).catch(err => {
      console.warn('[AuthService] Background profile sync failed:', err);
    });

    console.log('[AuthService] Login complete, user:', this._user()?.username);
    return { success: true };
  }

  private async _tryRefreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('kc_refresh_token');
    if (!refreshToken) return false;
    try {
      const response = await fetch(`${environment.digiAuthUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return false;
      const data: DigiAuthRefreshResponse = await response.json();
      this._storeTokens(data.accessToken, data.refreshToken);
      this._syncUserFromJwt(data.accessToken);
      return true;
    } catch {
      return false;
    }
  }

  private async _fetchAndSyncBackendProfile(): Promise<UserProfile | null> {
    try {
      const token = await this.getToken();
      if (!token) return null;
      const profile = await firstValueFrom(
        this._http.get<UserProfile>(`${environment.apiUrl}/users/me`)
      );
      this._userProfile.set(profile);
      return profile;
    } catch (err) {
      console.warn('[AuthService] Could not fetch /users/me:', err);
      return null;
    }
  }

  private _parseJwt(token: string): Record<string, unknown> | null {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  private _isTokenValid(token: string, marginSeconds = 0): boolean {
    const parsed = this._parseJwt(token);
    if (!parsed || typeof parsed['exp'] !== 'number') return false;
    return (parsed['exp'] as number) > (Date.now() / 1000 + marginSeconds);
  }

  private _syncUserFromJwt(token: string): void {
    const profile = this._parseJwt(token);
    if (!profile) return;
    const realmRoles: string[]  = (profile['realm_access'] as any)?.roles ?? [];
    // Collect roles from ALL clients in resource_access (not just the configured clientId)
    const resourceAccess = (profile['resource_access'] as Record<string, { roles: string[] }>) ?? {};
    const allClientRoles: string[] = Object.values(resourceAccess).flatMap(c => c?.roles ?? []);
    const allRoles = [...new Set([...realmRoles, ...allClientRoles])];
    console.log('[AuthService] JWT roles — realm:', realmRoles, '| clients:', allClientRoles);
    this._user.set({
      sub:       (profile['sub'] as string) ?? '',
      username:  (profile['preferred_username'] as string) ?? '',
      email:     (profile['email'] as string) ?? '',
      firstName: (profile['given_name'] as string) ?? '',
      lastName:  (profile['family_name'] as string) ?? '',
      roles:     allRoles,
    });
  }

  private _storeTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('kc_token', accessToken);
    localStorage.setItem('kc_refresh_token', refreshToken);
  }

  private _clearStoredTokens(): void {
    localStorage.removeItem('kc_token');
    localStorage.removeItem('kc_refresh_token');
  }

  private _scheduleTokenRefresh(): void {
    // Ne scheduler qu'une seule fois pour éviter les intervals multiples
    if (this._refreshScheduled) return;
    this._refreshScheduled = true;

    setInterval(async () => {
      const token = localStorage.getItem('kc_token');
      if (!token || !this._isTokenValid(token, 60)) {
        const refreshed = await this._tryRefreshToken();
        if (!refreshed) {
          // Ne déconnecter que si le token est vraiment expiré (pas juste un problème réseau)
          const currentToken = localStorage.getItem('kc_token');
          if (!currentToken || !this._isTokenValid(currentToken)) {
            console.warn('[AuthService] Token expired and refresh failed — logging out');
            this._clearStoredTokens();
            this._user.set(null);
            this._userProfile.set(null);
          }
        } else {
          this._fetchAndSyncBackendProfile();
        }
      }
    }, 60_000);
  }
}
