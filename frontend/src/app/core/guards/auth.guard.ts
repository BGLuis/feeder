import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('access_token');
  
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          localStorage.removeItem('access_token');
          return router.createUrlTree(['/login']);
        }
      }
      return true;
    } catch {
      localStorage.removeItem('access_token');
      return router.createUrlTree(['/login']);
    }
  }
  
  return router.createUrlTree(['/login']);
};
