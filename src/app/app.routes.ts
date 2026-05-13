import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/comparison/comparison.component').then(m => m.ComparisonComponent),
  },
  {
    path: 'questionnaire',
    loadComponent: () =>
      import('./components/questionnaire/questionnaire.component').then(m => m.QuestionnaireComponent),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./components/admin/admin.component').then(m => m.AdminComponent),
  },
  { path: '**', redirectTo: '' },
];
