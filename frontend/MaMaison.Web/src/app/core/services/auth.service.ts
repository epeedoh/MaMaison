import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthResult, LoginCommand, RegisterCommand, Role } from '../models/auth.model';

const TOKEN_KEY = 'mm_token';
const USER_KEY  = 'mm_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base   = `${environment.apiUrl}/auth`;

  private readonly _user = signal<AuthResult | null>(this.chargerDepuisStorage());

  readonly user      = this._user.asReadonly();
  readonly estConnecte = computed(() => !!this._user());
  readonly estAdmin    = computed(() => {
    const r = this._user()?.role;
    return r === Role.Admin || r === Role.SuperAdmin;
  });

  login(cmd: LoginCommand): Observable<AuthResult> {
    return this.http.post<AuthResult>(`${this.base}/login`, cmd).pipe(
      tap(result => this.sauvegarder(result))
    );
  }

  register(cmd: RegisterCommand): Observable<AuthResult> {
    return this.http.post<AuthResult>(`${this.base}/register`, cmd).pipe(
      tap(result => this.sauvegarder(result))
    );
  }

  deconnecter() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
    this.router.navigate(['/']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private sauvegarder(result: AuthResult) {
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result));
    this._user.set(result);
  }

  private chargerDepuisStorage(): AuthResult | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw) as AuthResult;
      if (new Date(user.expiration) < new Date()) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        return null;
      }
      return user;
    } catch { return null; }
  }
}
