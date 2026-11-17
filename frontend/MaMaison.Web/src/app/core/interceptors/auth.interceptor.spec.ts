import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('API credential boundary', () => {
  let http: HttpClient;
  let mock: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: AuthService, useValue: { getToken: () => 'synthetic-token' } },
    ] });
    http = TestBed.inject(HttpClient); mock = TestBed.inject(HttpTestingController);
  });
  afterEach(() => mock.verify());
  it('attaches credentials to the application API', () => {
    http.get('/api/profil').subscribe();
    const req = mock.expectOne('/api/profil');
    expect(req.request.headers.get('Authorization')).toBe('Bearer synthetic-token'); req.flush({});
  });
  for (const url of ['https://outside.example/api/profil', '/site-config.json', '/api-unrelated']) {
    it(`does not send credentials to ${url}`, () => {
      http.get(url).subscribe(); const req = mock.expectOne(url);
      expect(req.request.headers.has('Authorization')).toBeFalse(); req.flush({});
    });
  }
});
