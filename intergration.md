# Backend-Frontend Integration Guide

This document serves as the official rulebook for connecting the NestJS backend with the Angular frontend in the SendIT application.

## 📋 Integration Checklist

### Phase 1: Backend Configuration

#### 1.1 Install Required Packages
```bash
cd backend
npm install @nestjs/throttler class-validator class-transformer
```

#### 1.2 Configure CORS in Backend
**File: `backend/src/main.ts`**
```typescript
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Enable CORS
    app.enableCors({
      origin: process.env.FRONTEND_URL || 'http://localhost:4200',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });

    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    // API prefix
    app.setGlobalPrefix('api');

    const port = process.env.PORT ?? 3000;
    await app.listen(port);

    logger.log(`Application is running on: http://localhost:${port}`);
  } catch (error) {
    logger.error(
      'Failed to start application',
      error instanceof Error ? error.stack : error,
    );
    process.exit(1);
  }
}

void bootstrap();
```

#### 1.3 Environment Configuration
**Create a `backend/.env` file with the following variables:**

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/sendit_db"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
JWT_REFRESH_EXPIRES_IN="7d"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:4200"

# API Configuration
PORT=3000

# Email Configuration (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Application Configuration
NODE_ENV="development"
```

**Important Notes:**
- Replace all placeholder values with your actual configuration
- Keep your `.env` file secure and never commit it to version control
- For production, use strong, unique secrets for JWT keys
- Use environment-specific values for different deployment stages

### Phase 2: Frontend Configuration

#### 2.1 Environment Configuration
**File: `frontend/src/environments/environment.ts`**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  mapboxToken: 'your_mapbox_token',
};
```

**File: `frontend/src/environments/environment.prod.ts`**
```typescript
export const environment = {
  production: true,
//   apiUrl: 'https://your-production-api.com/api',
//   mapboxToken: 'your_mapbox_token',
};
```

#### 2.2 HTTP Interceptor for Authentication
**File: `frontend/src/app/guards/auth.interceptor.ts`**
```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    
    if (token) {
      req = this.addTokenHeader(req, token);
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && token) {
          return this.handle401Error(req, next);
        }
        return throwError(() => error);
      })
    );
  }

  private addTokenHeader(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      headers: request.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((response: any) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(response.accessToken);
          return next.handle(this.addTokenHeader(request, response.accessToken));
        }),
        catchError((error) => {
          this.isRefreshing = false;
          this.authService.logout();
          this.router.navigate(['/login']);
          return throwError(() => error);
        })
      );
    }

    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap((token) => next.handle(this.addTokenHeader(request, token)))
    );
  }
}
```

#### 2.3 Update App Config
**File: `frontend/src/app/app.config.ts`**
```typescript
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { AuthInterceptor } from './guards/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withRouterConfig({
        onSameUrlNavigation: 'reload'
      })
    ),
    provideHttpClient(
      withInterceptors([AuthInterceptor])
    )
  ]
};
```

#### 2.4 Update Auth Service
**File: `frontend/src/app/services/auth.service.ts`**
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  isActive: boolean;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  email: string;
  token: string;  // 6-digit token
  newPassword: string;
}

export interface PasswordResetResponse {
  message: string;
  success: boolean;
}

export interface TokenVerificationResponse {
  message: string;
  success: boolean;
  isValid: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  // ... existing methods ...

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        map(response => {
          this.setAuth(response);
          return response;
        })
      );
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, userData)
      .pipe(
        map(response => {
          this.setAuth(response);
          return response;
        })
      );
  }

  logout(): void {
    const user = this.currentUserSubject.value;
    if (user) {
      this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe();
    }
    this.clearAuth();
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        map(response => {
          this.setAuth(response);
          return response;
        })
      );
  }

  // Request password reset - sends 6-digit token to email
  requestPasswordReset(email: string): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  // Verify 6-digit token before allowing password reset
  verifyResetToken(email: string, token: string): Observable<TokenVerificationResponse> {
    return this.http.post<TokenVerificationResponse>(`${this.apiUrl}/auth/verify-reset-token`, { 
      email, 
      token 
    });
  }

  // Confirm password reset with 6-digit token
  confirmPasswordReset(email: string, token: string, newPassword: string): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(`${this.apiUrl}/auth/reset-password`, { 
      email,
      token, 
      newPassword 
    });
  }

  // Change password (for authenticated users)
  changePassword(currentPassword: string, newPassword: string): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(`${this.apiUrl}/auth/change-password`, {
      currentPassword,
      newPassword
    });
  }

  // ... rest of existing methods ...
}
```

### Phase 3: API Services Creation

#### 3.1 Base API Service
**File: `frontend/src/app/services/base-api.service.ts`**
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ToastService } from '../components/shared/toast/toast.service';

@Injectable({
  providedIn: 'root'
})
export class BaseApiService {
  protected apiUrl = environment.apiUrl;

  constructor(
    protected http: HttpClient,
    private toastService: ToastService
  ) {}

  protected get<T>(endpoint: string, params?: HttpParams): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}${endpoint}`, { params })
      .pipe(catchError(this.handleError.bind(this)));
  }

  protected post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}${endpoint}`, data)
      .pipe(catchError(this.handleError.bind(this)));
  }

  protected put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}${endpoint}`, data)
      .pipe(catchError(this.handleError.bind(this)));
  }

  protected patch<T>(endpoint: string, data: any): Observable<T> {
    return this.http.patch<T>(`${this.apiUrl}${endpoint}`, data)
      .pipe(catchError(this.handleError.bind(this)));
  }

  protected delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}${endpoint}`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.message || `Error Code: ${error.status}`;
    }

    this.toastService.showError(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
```

#### 3.2 Create Specific API Services

**Parcel Service Template:**
```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

export interface Parcel {
  id: string;
  // Define parcel interface based on backend schema
}

@Injectable({
  providedIn: 'root'
})
export class ParcelService extends BaseApiService {
  
  getParcels(): Observable<Parcel[]> {
    return this.get<Parcel[]>('/parcels');
  }

  getParcelById(id: string): Observable<Parcel> {
    return this.get<Parcel>(`/parcels/${id}`);
  }

  createParcel(parcelData: Partial<Parcel>): Observable<Parcel> {
    return this.post<Parcel>('/parcels', parcelData);
  }

  updateParcel(id: string, updates: Partial<Parcel>): Observable<Parcel> {
    return this.patch<Parcel>(`/parcels/${id}`, updates);
  }

  deleteParcel(id: string): Observable<void> {
    return this.delete<void>(`/parcels/${id}`);
  }
}
```

### Phase 4: Development Rules & Best Practices

#### 4.1 API Integration Rules
1. **Always use the BaseApiService**: Extend from BaseApiService for consistent error handling
2. **Environment-based URLs**: Never hardcode API URLs; always use environment configuration
3. **Strong Typing**: Define TypeScript interfaces for all API responses
4. **Error Handling**: Use toast notifications for user-facing errors, avoid browser alerts
5. **Loading States**: Implement loading indicators for all API calls
6. **Retry Logic**: Implement retry logic for failed network requests where appropriate

#### 4.2 Authentication Rules
1. **Token Management**: Store tokens in localStorage, not sessionStorage
2. **Auto-refresh**: Implement automatic token refresh on 401 errors
3. **Route Guards**: Protect routes based on authentication and roles
4. **Logout Cleanup**: Always clear all stored data on logout

#### 4.3 Data Flow Rules
1. **Services for API**: Keep all HTTP calls in services, not components
2. **Observables**: Use Observables for reactive data flow
3. **Unsubscribe**: Always unsubscribe from observables in component destroy
4. **State Management**: Consider using a state management solution for complex data

#### 4.4 Testing Requirements
1. **Mock Services**: Create mock services for unit testing
2. **HTTP Testing**: Use HttpClientTestingModule for HTTP testing
3. **Environment Testing**: Test with different environment configurations

### Phase 5: Deployment Configuration

#### 5.1 Backend Production
```typescript
// backend/src/main.ts - Production CORS
app.enableCors({
  origin: [
    process.env.FRONTEND_URL,
    'https://your-production-domain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});
```

#### 5.2 Frontend Production
```typescript
// frontend/src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://your-production-api.com/api',
  mapboxToken: 'production_mapbox_token',
};
```

### Phase 6: Common Integration Issues & Solutions

#### 6.1 CORS Issues
- **Problem**: CORS errors in browser console
- **Solution**: Ensure backend CORS is properly configured with correct origins

#### 6.2 Authentication Issues
- **Problem**: 401 errors on protected routes
- **Solution**: Verify token is being sent in Authorization header

#### 6.3 Environment Issues
- **Problem**: API calls failing in production
- **Solution**: Check environment.prod.ts has correct production API URL

#### 6.4 Network Errors
- **Problem**: Network timeouts or connection errors
- **Solution**: Implement retry logic and proper error handling

### Phase 7: Integration Testing Checklist

- [ ] Backend runs on port 3000
- [ ] Frontend runs on port 4200
- [ ] CORS allows frontend origin
- [ ] Authentication tokens work correctly
- [ ] API endpoints return expected data
- [ ] Error handling displays proper messages
- [ ] Loading states work correctly
- [ ] Role-based access control functions
- [ ] Environment variables are configured
- [ ] Production build works correctly

## 🚀 Quick Start Commands

### Start Backend
```bash
cd backend
npm run start:dev
```

### Start Frontend
```bash
cd frontend
ng serve
```

### Test Integration
1. Open browser to `http://localhost:4200`
2. Register/login to test authentication
3. Navigate through protected routes
4. Test CRUD operations
5. Check browser network tab for successful API calls

## 📝 Notes

- Always test integration after making changes to either backend or frontend
- Keep this document updated as the integration evolves
- Follow the brand color scheme: Yellow (#DBBB02), Black, White
- Use toast notifications for all user feedback
- Maintain consistent TypeScript typing throughout