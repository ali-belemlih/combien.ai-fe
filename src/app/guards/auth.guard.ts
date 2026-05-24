import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard qui protège les routes nécessitant une authentification.
 * Redirige directement vers Keycloak si non connecté.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);

  // Keycloak est garanti initialisé grâce à APP_INITIALIZER
  if (auth.isAuthenticated()) return true;

  // Redirige directement vers Keycloak
  auth.login();
  return false;
};

/**
 * Guard qui protège les routes nécessitant le rôle "admin".
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    auth.login();
    return false;
  }

  if (!auth.isAdmin()) {
    // Connecté mais pas admin → retour à l'accueil
    router.navigate(['/']);
    return false;
  }

  return true;
};
