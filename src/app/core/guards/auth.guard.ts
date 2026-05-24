import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    const expectedRole = route.data['role'] as string;
    
    // Si la ruta requiere un rol en particular y el usuario no lo tiene
    if (expectedRole && authService.currentUser()?.role !== expectedRole) {
      if (authService.isAdmin()) {
        router.navigate(['/admin']);
      } else {
        router.navigate(['/dashboard']);
      }
      return false;
    }
    return true;
  }

  // Redireccionar al login si no ha iniciado sesión
  router.navigate(['/login']);
  return false;
};
