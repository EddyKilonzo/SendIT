import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    // Check for required roles
    const requiredRoles = route.data['roles'] as string[];
    if (requiredRoles && requiredRoles.length > 0) {
      if (!this.authService.hasAnyRole(requiredRoles)) {
        // Redirect to appropriate page based on user role
        this.redirectBasedOnRole();
        return false;
      }
    }

    return true;
  }

  private redirectBasedOnRole(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      switch (user.role) {
        case 'CUSTOMER':
          this.router.navigate(['/user']);
          break;
        case 'DRIVER':
          this.router.navigate(['/driver']);
          break;
        case 'ADMIN':
          this.router.navigate(['/admin']);
          break;
        default:
          this.router.navigate(['/']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }
} 