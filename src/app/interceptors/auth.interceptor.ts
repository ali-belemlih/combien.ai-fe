import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

/**
 * URLs qui ne nécessitent PAS de token (publiques).
 * Toutes les autres requêtes vers apiUrl auront le Bearer attaché.
 */
const PUBLIC_PATHS = [
  '/health',
  '/compare/',
  '/offres-internet/operators',
  '/offres-voix/',
  '/roaming/',
  '/recommend/next',
  '/recommend/questions',
];

function isPublicPath(url: string): boolean {
  const path = url.replace(environment.apiUrl, '');
  return PUBLIC_PATHS.some(p => path.startsWith(p));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Ne rien faire pour les URLs hors apiUrl (ex: digi-auth)
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const auth = inject(AuthService);

  return from(auth.getToken()).pipe(
    switchMap(token => {
      if (token) {
        // Token présent → attacher le Bearer
        return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
      }

      // Pas de token
      if (isPublicPath(req.url)) {
        // Route publique → laisser passer sans token
        return next(req);
      }

      // Route protégée sans token → erreur 401 immédiate sans faire la requête
      return throwError(() => new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        url: req.url,
        error: { detail: 'Non connecté. Veuillez vous reconnecter.' },
      }));
    }),
  );
};
