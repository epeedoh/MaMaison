import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Intercepteur pour les tunnels VS Code devtunnels.ms.
 * Ajoute le header requis pour bypasser la page d'avertissement du tunnel.
 */
export const tunnelInterceptor: HttpInterceptorFn = (req, next) => {
  const isTunnel = environment.apiUrl.includes('devtunnels.ms')
    || environment.apiUrl.includes('githubpreview.dev');

  if (!isTunnel) return next(req);

  const modifiedReq = req.clone({
    setHeaders: {
      'x-tunnel-skip-browser-warning': 'true',
    }
  });

  return next(modifiedReq);
};
