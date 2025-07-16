import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home';
import { Signup } from './components/signup/signup';
import { Login } from './components/login/login';
import { Reset } from './components/reset/reset';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'signup', component: Signup },
  { path: 'login', component: Login },
  { path: 'reset', component: Reset },
];
