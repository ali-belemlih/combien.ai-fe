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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _kc: Keycloak;

  // Signals réactifs
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

  /**
   * Initialise Keycloak. Appelé au démarrage de l'app via APP_INITIALIZER.
   * check-sso : vérifie silencieusement si une session existe déjà.
   */
  async init(): Promise<void> {
    try {
      const authenticated = await this._kc.init({
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        checkLoginIframe: false,
        // Pas de silentCheckSsoRedirectUri pour éviter les problèmes CSP iframe
      });

      if (authenticated) {
        this._syncUser();
        this._scheduleTokenRefresh();
      }
    } catch (err) {
      console.error('[AuthService] Keycloak init failed:', err);
    } finally {
      this._initialized.set(true);
    }
  }

  /** Redirige vers la page de login Keycloak. */
  login(): void {
    this._kc.login({ redirectUri: window.location.href });
  }

  /** Déconnecte l'utilisateur et redirige vers l'accueil. */
  logout(): void {
    this._kc.logout({ redirectUri: window.location.origin });
  }

  /** Retourne le token Bearer courant (rafraîchi si nécessaire). */
  async getToken(): Promise<string | null> {
    try {
      // Rafraîchit le token s'il expire dans moins de 30s
      await this._kc.updateToken(30);
      return this._kc.token ?? null;
    } catch {
      return null;
    }
  }

  /** Retourne le token de manière synchrone (peut être expiré). */
  getTokenSync(): string | null {
    return this._kc.token ?? null;
  }

  /** Vérifie si l'utilisateur a un rôle donné. */
  hasRole(role: string): boolean {
    return this._user()?.roles.includes(role) ?? false;
  }

  // ── Privé ──────────────────────────────────────────────────────────────────

  private _syncUser(): void {
    const profile = this._kc.tokenParsed;
    if (!profile) return;

    const realmRoles: string[] = profile['realm_access']?.roles ?? [];
    const clientRoles: string[] = profile['resource_access']?.[environment.keycloak.clientId]?.roles ?? [];
    // Rôles du client API backend aussi
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

  private _scheduleTokenRefresh(): void {
    // Rafraîchit le token toutes les 60s
    setInterval(async () => {
      try {
        const refreshed = await this._kc.updateToken(60);
        if (refreshed) this._syncUser();
      } catch {
        // Token expiré et non rafraîchissable → déconnexion
        this._user.set(null);
      }
    }, 60_000);
  }
}
