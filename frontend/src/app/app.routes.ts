import { MainLayoutComponent } from './ui/templates/main-layout.component';
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'discover',
        loadComponent: () => import('./pages/discover.component').then((m) => m.DiscoverComponent),
      },
      {
        path: 'reader',
        loadComponent: () => import('./pages/reader.component').then((m) => m.ReaderComponent),
      },
      {
        path: 'admin',
        loadComponent: () => import('./pages/admin.component').then((m) => m.AdminComponent),
        canActivate: [adminGuard],
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
];
