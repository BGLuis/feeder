import { Routes } from '@angular/router';
import { MainLayoutComponent } from './ui/templates/main-layout.component';
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
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardComponent },
      { path: 'discover', component: DiscoverComponent },
      { path: 'reader', component: ReaderComponent },
      { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
      { path: 'settings', component: SettingsComponent },
    ],
  },
];
