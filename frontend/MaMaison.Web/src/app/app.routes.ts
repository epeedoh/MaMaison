import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component')
        .then(m => m.HomeComponent)
  },
  {
    path: 'villas',
    loadComponent: () =>
      import('./features/villas/pages/villas-liste/villas-liste')
        .then(m => m.VillasListeComponent)
  },
  {
    path: 'villas/:id',
    loadComponent: () =>
      import('./features/villas/pages/villa-detail/villa-detail')
        .then(m => m.VillaDetailComponent)
  },
  {
    path: 'locations',
    loadComponent: () =>
      import('./features/locations/pages/locations-liste/locations-liste')
        .then(m => m.LocationsListeComponent)
  },
  {
    path: 'locations/:id',
    loadComponent: () =>
      import('./features/locations/pages/location-detail/location-detail')
        .then(m => m.LocationDetailComponent)
  },
  {
    path: 'terrains',
    loadComponent: () =>
      import('./features/terrains/pages/terrains-liste/terrains-liste')
        .then(m => m.TerrainsListeComponent)
  },
  {
    path: 'terrains/:id',
    loadComponent: () =>
      import('./features/terrains/pages/terrain-detail/terrain-detail.component')
        .then(m => m.TerrainDetailComponent)
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin-dashboard/admin-dashboard.component')
        .then(m => m.AdminDashboardComponent)
  },
  {
    path: 'publier',
    loadComponent: () =>
      import('./features/proprietaire/soumettre-location/soumettre-location.component')
        .then(m => m.SoumettreLocationComponent)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register.component').then(m => m.RegisterComponent)
  },
  { path: '**', redirectTo: '' }
];
