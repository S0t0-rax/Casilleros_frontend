import { Routes } from '@angular/router';
import { Auth } from './features/auth/auth';
import { Client } from './features/client/client';
import { Admin } from './features/admin/admin';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Auth },
  { 
    path: 'dashboard', 
    component: Client
  },
  { 
    path: 'admin', 
    component: Admin, 
    canActivate: [authGuard], 
    data: { role: 'ADMIN' } 
  },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];
