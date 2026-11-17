import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { normalizePublicPhone, SiteConfigService } from './site-config.service';

describe('Public site configuration', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('starts safely and enables only an explicit boolean', () => {
    const service = TestBed.inject(SiteConfigService);
    expect(service.demo3dEnabled()).toBeFalse();
    expect(service.whatsappUrl()).toBeNull();
    const request = http.expectOne('/site-config.json');
    expect(request.request.headers.get('ngsw-bypass')).toBe('true');
    request.flush({ demo3dEnabled: true, whatsappNumber: '+225 07 12 34 56 78' });
    expect(service.demo3dEnabled()).toBeTrue();
    expect(service.whatsappUrl('Villa & jardin')).toBe('https://wa.me/2250712345678?text=Villa%20%26%20jardin');
  });

  for (const config of [{}, { demo3dEnabled: 'true', whatsappNumber: '2250700000000' }, { demo3dEnabled: false }, 'invalid']) {
    it(`keeps optional features disabled for ${JSON.stringify(config)}`, () => {
      const service = TestBed.inject(SiteConfigService);
      http.expectOne('/site-config.json').flush(config);
      expect(service.demo3dEnabled()).toBeFalse();
      expect(service.whatsappUrl()).toBeNull();
    });
  }

  it('survives a missing configuration', () => {
    const service = TestBed.inject(SiteConfigService);
    http.expectOne('/site-config.json').flush({}, { status: 404, statusText: 'Not found' });
    expect(service.demo3dEnabled()).toBeFalse();
    expect(service.whatsappUrl()).toBeNull();
  });

  it('hides unsupported admin controls on the legacy demo without disabling its viewer', () => {
    const service = TestBed.inject(SiteConfigService);
    http.expectOne('/site-config.json').flush({ demo3dEnabled:true, adminSiteSettingsEnabled:false });
    expect(service.adminSiteSettingsEnabled()).toBeFalse();
    expect(service.demo3dEnabled()).toBeTrue();
    service.reload();
    http.expectOne('/site-config.json').flush({ demo3dEnabled:false, whatsappNumber:'' });
    expect(service.adminSiteSettingsEnabled()).toBeTrue();
  });

  it('times out without blocking the application', fakeAsync(() => {
    const service = TestBed.inject(SiteConfigService);
    const request = http.expectOne('/site-config.json');
    tick(3001);
    expect(request.cancelled).toBeTrue();
    expect(service.demo3dEnabled()).toBeFalse();
  }));

  for (const number of ['', null, 2250712345678, '+22507000000', '+2250700000000', '+22527000000', '0712345678', 'javascript:12345678', '12345678?text=bad', '+225 07 12 abc 34']) {
    it(`rejects invalid or demo contact ${number}`, () => expect(normalizePublicPhone(number)).toBe(''));
  }
});
