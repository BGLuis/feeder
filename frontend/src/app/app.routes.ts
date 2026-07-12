import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard.component';
import { LoginComponent } from './pages/login.component';
import { DiscoverComponent } from './pages/discover.component';
import { authGuard } from './core/guards/auth.guard';

import { RegisterComponent } from './pages/register.component';
import { ReaderComponent } from './pages/reader.component';
import { AdminComponent } from './pages/admin.component';
import { SettingsComponent } from './pages/settings.component';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'discover', component: DiscoverComponent, canActivate: [authGuard] },
  { path: 'reader', component: ReaderComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [authGuard, adminGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
];
