import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { FonctionnalitesService } from '../../../core/services/fonctionnalites.service';

describe('AdminDashboardComponent loading', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [AdminDashboardComponent],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
      { provide: FonctionnalitesService, useValue: { actualiser: jasmine.createSpy() } }],
  }));

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('does not leave old figures displayed after a failed refresh', () => {
    const component = TestBed.createComponent(AdminDashboardComponent).componentInstance;
    component.dashboard = { utilisateurs: 42 };
    component.chargerDashboard();
    expect(component.dashboard).toBeNull();
    TestBed.inject(HttpTestingController).expectOne('/api/admin/dashboard').flush({}, {status:503,statusText:'Unavailable'});
    expect(component.loading()).toBeFalse();
    expect(component.message()).toContain('ne peut pas être chargé');
  });

  it('uses the API figures after a successful refresh', () => {
    const component = TestBed.createComponent(AdminDashboardComponent).componentInstance;
    component.chargerDashboard();
    TestBed.inject(HttpTestingController).expectOne('/api/admin/dashboard').flush({utilisateurs:2});
    expect(component.dashboard.utilisateurs).toBe(2);
    expect(component.loading()).toBeFalse();
  });
});
