import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(DOCUMENT).baseURI;
  const api = new URL(environment.apiUrl.replace(/\/$/, '') + '/', base);
  const target = new URL(req.url, base);
  if (target.origin !== api.origin || !target.pathname.startsWith(api.pathname)) return next(req);
  const token = inject(AuthService).getToken();
  if (!token) return next(req);

  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  }));
};
