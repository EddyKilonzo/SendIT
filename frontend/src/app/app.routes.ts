import { Routes } from '@angular/router';
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

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'signup', component: Signup },
  { path: 'login', component: Login },
  { path: 'reset', component: Reset },
  // Admin routes
  { path: 'admin-dashboard', component: AdminDashboard },
  { path: 'admin-create-delivery', component: CreateDelivery },
  { path: 'admin-assign-driver', component: AssignDriver },
  { path: 'admin-manage-parcels', component: ManageParcels },
  { path: 'admin-parcel-details/:id', component: AdminParcelDetails },
  { path: 'admin-manage-users', component: ManageUsers },
  { path: 'admin-user-details/:id', component: UserDetails },
  { path: 'order-confirmation', component: OrderConfirmation },
  { path: 'profile', component: Profile },
  // User routes
  { path: 'user-dashboard', component: UserDashboard },
  { path: 'user-parcels', component: UserParcels },
  { path: 'parcel-details/:id', component: ParcelDetails },
];
