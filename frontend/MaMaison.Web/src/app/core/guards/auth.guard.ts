import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.estConnecte()) return true;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const adminGuard: CanActivateFn = (_, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.estAdmin()) return true;
  if (!auth.estConnecte()) return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  return router.createUrlTree(['/']);
};

export const publisherGuard: CanActivateFn = (_, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.peutPublier()) return true;
  return auth.estConnecte() ? router.createUrlTree(['/profil'])
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
