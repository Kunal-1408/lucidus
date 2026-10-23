import { Routes } from '@angular/router';
import { ProfilePage } from './profile/profile-page';
import { ResultsPage } from './results/results-page';

export const routes: Routes = [
  { path: '', component: ProfilePage },
  { path: 'results', component: ResultsPage },
  { path: '**', redirectTo: '' },
];
