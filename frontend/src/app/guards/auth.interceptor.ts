import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

// Global state for token refresh
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<any>(null);

export const AuthInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<any> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Skip interceptor for auth endpoints to prevent infinite loops
  if (req.url.includes('/auth/login') || req.url.includes('/auth/register') || req.url.includes('/auth/refresh')) {
    console.log('AuthInterceptor - Skipping auth endpoint:', req.url);
    return next(req);
  }
  
  const token = authService.getToken();
  
  console.log('AuthInterceptor - Request URL:', req.url);
  console.log('AuthInterceptor - Token exists:', !!token);
  
  if (token) {
    req = addTokenHeader(req, token);
    console.log('AuthInterceptor - Added token to request');
  } else {
    console.log('AuthInterceptor - No token available, proceeding without auth');
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('AuthInterceptor - Error:', error);
      console.error('AuthInterceptor - Error status:', error.status);
      console.error('AuthInterceptor - Error message:', error.message);
      
      if (error.status === 401 && token && !req.url.includes('/auth/refresh')) {
        console.log('AuthInterceptor - 401 error, attempting token refresh');
        return handle401Error(req, next, authService, router);
      }
      return throwError(() => error);
    })
  );
};

function addTokenHeader(request: HttpRequest<any>, token: string): HttpRequest<any> {
  return request.clone({
    headers: request.headers.set('Authorization', `Bearer ${token}`)
  });
}

function handle401Error(
  request: HttpRequest<any>, 
  next: HttpHandlerFn, 
  authService: AuthService, 
  router: Router
): Observable<any> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    console.log('AuthInterceptor - Attempting token refresh...');

    return authService.refreshToken().pipe(
      switchMap((response: any) => {
        isRefreshing = false;
        refreshTokenSubject.next(response.accessToken);
        console.log('AuthInterceptor - Token refresh successful');
        return next(addTokenHeader(request, response.accessToken));
      }),
      catchError((error) => {
        isRefreshing = false;
        console.error('Token refresh failed:', error);
        
        // Clear auth and redirect to login
        authService.logout();
        router.navigate(['/login']);
        
        // Show user-friendly message
        const errorMessage = error.error?.message || 'Your session has expired. Please log in again.';
        console.error('Authentication error:', errorMessage);
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  console.log('AuthInterceptor - Waiting for token refresh to complete...');
  return refreshTokenSubject.pipe(
    filter(token => token !== null),
    take(1),
    switchMap((token) => next(addTokenHeader(request, token)))
  );
} 