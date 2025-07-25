import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { SidebarComponent } from './sidebar';
import { AuthService } from '../../../services/auth.service';
import { of } from 'rxjs';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    
    await TestBed.configureTestingModule({
      imports: [SidebarComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter navigation items based on user role', () => {
    // Mock admin user
    authService.getCurrentUser.and.returnValue({ role: 'ADMIN', name: 'Admin User' });
    
    fixture.detectChanges();
    
    const visibleItems = component.getVisibleNavItems();
    expect(visibleItems.some(item => item.label === 'Create Delivery')).toBeTruthy();
    expect(visibleItems.some(item => item.label === 'Manage Parcels')).toBeTruthy();
    expect(visibleItems.some(item => item.label === 'Manage Users')).toBeTruthy();
  });

  it('should set correct dashboard route for admin', () => {
    authService.getCurrentUser.and.returnValue({ role: 'ADMIN', name: 'Admin User' });
    
    fixture.detectChanges();
    
    const dashboardItem = component.navigationItems.find(item => item.label === 'Dashboard');
    expect(dashboardItem?.route).toBe('/admin/admin-dashboard');
  });

  it('should set correct dashboard route for customer', () => {
    authService.getCurrentUser.and.returnValue({ role: 'CUSTOMER', name: 'Customer User' });
    
    fixture.detectChanges();
    
    const dashboardItem = component.navigationItems.find(item => item.label === 'Dashboard');
    expect(dashboardItem?.route).toBe('/user/user-dashboard');
  });

  it('should set correct dashboard route for driver', () => {
    authService.getCurrentUser.and.returnValue({ role: 'DRIVER', name: 'Driver User' });
    
    fixture.detectChanges();
    
    const dashboardItem = component.navigationItems.find(item => item.label === 'Dashboard');
    expect(dashboardItem?.route).toBe('/driver/driver-dashboard');
  });
}); 