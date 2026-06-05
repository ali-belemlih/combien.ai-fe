import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  const returnUrl = route.url.map(s => s.path).join('/') || '/';
  router.navigate(['/login'], { queryParams: { returnUrl } });
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: '/admin' } });
    return false;
  }

  if (!auth.isAdmin()) {
    router.navigate(['/']);
    return false;
  }

  return true;
};
