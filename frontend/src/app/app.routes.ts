import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { HomeComponent } from './components/home/home';
import { Signup } from './components/signup/signup';
import { Login } from './components/login/login';
import { Reset } from './components/reset/reset';
import { AdminDashboard } from './components/admin/admin-dashboard/admin-dashboard';
import { CreateDelivery } from './components/admin/create-delivery/create-delivery';
import { OrderConfirmation } from './components/admin/create-delivery/order-confirmation/order-confirmation';
import { AssignDriver } from './components/admin/create-delivery/assign-driver/assign-driver';
import { ManageParcels } from './components/admin/manage-parcels/manage-parcels';
import { ParcelDetails as AdminParcelDetails } from './components/admin/manage-parcels/parcel-details/parcel-details';
import { ManageUsers } from './components/admin/manage-users/manage-users';
import { UserDetails } from './components/admin/manage-users/user-details/user-details';
import { Profile } from './components/profile/profile';
import { UserDashboard } from './components/user/user-dashboard/user-dashboard';
import { UserParcels } from './components/user/user-parcels/user-parcels';
import { ParcelDetails } from './components/user/parcel-details/parcel-details';
import { DriverDashboard } from './components/driver/driver-dashboard/driver-dashboard';
import { AssignedParcels } from './components/driver/assigned-parcels/assigned-parcels';
import { DriverParcelDetails } from './components/driver/parcel-details/parcel-details';
import { DeliveryHistory } from './components/driver/delivery-history/delivery-history';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'signup', component: Signup },
  { path: 'login', component: Login },
  { path: 'reset', component: Reset },
  
  // Admin routes - protected with ADMIN role
  { path: 'admin', children: [
    { path: 'dashboard', component: AdminDashboard, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
    { path: 'create-delivery', component: CreateDelivery, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
    { path: 'assign-driver', component: AssignDriver, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
    { path: 'manage-parcels', component: ManageParcels, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
    { path: 'parcel-details/:id', component: AdminParcelDetails, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
    { path: 'manage-users', component: ManageUsers, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
    { path: 'user-details/:id', component: UserDetails, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  ]},
  
  // User routes - protected with CUSTOMER role
  { path: 'user', children: [
    { path: 'dashboard', component: UserDashboard, canActivate: [AuthGuard], data: { roles: ['CUSTOMER'] } },
    { path: 'parcels', component: UserParcels, canActivate: [AuthGuard], data: { roles: ['CUSTOMER'] } },
    { path: 'parcel-details/:id', component: ParcelDetails, canActivate: [AuthGuard], data: { roles: ['CUSTOMER'] } },
  ]},
  
  // Driver routes - protected with DRIVER role
  { path: 'driver', children: [
    { path: 'dashboard', component: DriverDashboard, canActivate: [AuthGuard], data: { roles: ['DRIVER'] } },
    { path: 'my-parcels', component: AssignedParcels, canActivate: [AuthGuard], data: { roles: ['DRIVER'] } },
    { path: 'history', component: DeliveryHistory, canActivate: [AuthGuard], data: { roles: ['DRIVER'] } },
    { path: 'parcel-details/:id', component: DriverParcelDetails, canActivate: [AuthGuard], data: { roles: ['DRIVER'] } },
  ]},
  
  // Profile route - protected for all authenticated users
  { path: 'profile', component: Profile, canActivate: [AuthGuard] },
  
  // Legacy routes for backward compatibility - protected with appropriate roles
  { path: 'admin-dashboard', component: AdminDashboard, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'admin-create-delivery', component: CreateDelivery, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'admin-assign-driver', component: AssignDriver, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'admin-manage-parcels', component: ManageParcels, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'admin-parcel-details/:id', component: AdminParcelDetails, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'admin-manage-users', component: ManageUsers, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'admin-user-details/:id', component: UserDetails, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'order-confirmation', component: OrderConfirmation, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'user-dashboard', component: UserDashboard, canActivate: [AuthGuard], data: { roles: ['CUSTOMER'] } },
  { path: 'user-parcels', component: UserParcels, canActivate: [AuthGuard], data: { roles: ['CUSTOMER'] } },
  { path: 'parcel-details/:id', component: ParcelDetails, canActivate: [AuthGuard], data: { roles: ['CUSTOMER'] } },
  { path: 'driver-dashboard', component: DriverDashboard, canActivate: [AuthGuard], data: { roles: ['DRIVER'] } },
  { path: 'driver-my-parcels', component: AssignedParcels, canActivate: [AuthGuard], data: { roles: ['DRIVER'] } },
  { path: 'driver-history', component: DeliveryHistory, canActivate: [AuthGuard], data: { roles: ['DRIVER'] } },
  { path: 'driver-parcel-details/:id', component: DriverParcelDetails, canActivate: [AuthGuard], data: { roles: ['DRIVER'] } },
];
