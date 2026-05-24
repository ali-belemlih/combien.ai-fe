import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/comparison/comparison.component').then(m => m.ComparisonComponent),
  },
  {
    path: 'questionnaire',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/questionnaire/questionnaire.component').then(m => m.QuestionnaireComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'voix',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./components/admin/admin.component').then(m => m.AdminComponent),
  },
  { path: '**', redirectTo: '' },
];
