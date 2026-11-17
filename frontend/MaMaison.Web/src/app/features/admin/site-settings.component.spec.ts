import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SiteSettingsComponent } from './site-settings.component';
import { SiteConfigService } from '../../core/services/site-config.service';
import { environment } from '../../../environments/environment';

describe('Admin site settings', () => {
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/admin/site-config`;
  const current = { demo3dEnabled: false, version: 'initial', updatedAt: null };
  const reload = jasmine.createSpy('reload');
  beforeEach(() => {
    reload.calls.reset();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: SiteConfigService, useValue: { reload } }] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('saves a versioned toggle once and refreshes public configuration', () => {
    const component = TestBed.createComponent(SiteSettingsComponent).componentInstance;
    http.expectOne(url).flush(current);
    component.enabled = true;
    component.save(); component.save();
    const save = http.expectOne(url);
    expect(save.request.method).toBe('PUT');
    expect(save.request.body).toEqual({ demo3dEnabled: true, version: 'initial' });
    save.flush({ ...current, demo3dEnabled: true, version: 'next' });
    expect(component.settings()?.demo3dEnabled).toBeTrue();
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it('does not claim success or update public state after a conflict', () => {
    const component = TestBed.createComponent(SiteSettingsComponent).componentInstance;
    http.expectOne(url).flush(current);
    component.enabled = true; component.save();
    http.expectOne(url).flush({}, { status: 409, statusText: 'Conflict' });
    expect(component.failed()).toBeTrue();
    expect(component.settings()?.demo3dEnabled).toBeFalse();
    expect(reload).not.toHaveBeenCalled();
    component.load();
    http.expectOne(url).flush({ ...current, version: 'reloaded' });
    expect(component.enabled).toBeFalse();
  });
  it('does not allow a write when loading failed', () => {
    const component = TestBed.createComponent(SiteSettingsComponent).componentInstance;
    http.expectOne(url).flush({}, { status: 503, statusText: 'Unavailable' });
    component.enabled = true; component.save();
    http.expectNone(url);
    expect(component.failed()).toBeTrue();
  });
});
