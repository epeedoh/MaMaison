import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from '../models/auth.model';

describe('AuthService profile refresh', () => {
  beforeEach(() => {
    localStorage.removeItem('mm_user');
    localStorage.removeItem('mm_token');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
  });
  afterEach(() => {
    localStorage.removeItem('mm_user');
    localStorage.removeItem('mm_token');
  });

  it('refreshes the persisted name without changing identity or permissions', () => {
    const user = { nom: 'Before', telephone: '0700000000', utilisateurId: 'synthetic-user',
      token: 'synthetic-token', expiration: '2099-01-01T00:00:00Z', role: Role.Visiteur };
    localStorage.setItem('mm_user', JSON.stringify(user));
    localStorage.setItem('mm_token', user.token);
    const auth = TestBed.inject(AuthService);
    auth.actualiserNom('After');
    expect(auth.user()).toEqual({ ...user, nom: 'After' });
    expect(JSON.parse(localStorage.getItem('mm_user')!)).toEqual({ ...user, nom: 'After' });
    expect(auth.getToken()).toBe(user.token);
  });

  it('does not create a session when disconnected', () => {
    const auth = TestBed.inject(AuthService);
    auth.actualiserNom('Ignored');
    expect(auth.user()).toBeNull();
    expect(localStorage.getItem('mm_user')).toBeNull();
  });
});
