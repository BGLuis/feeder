import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { firstValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from './api.token';

export interface AuthResponse {
  access_token: string;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export interface UserPayload {
  email: string;
  sub: string;
  role?: UserRole;
  name?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiBaseUrl = inject(API_BASE_URL);
  private apiUrl = `${this.apiBaseUrl}/auth`;
  
  currentUser = signal<UserPayload | null>(null);

  constructor() {
    this.loadUserFromToken();
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === UserRole.ADMIN;
  }

  private loadUserFromToken() {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.currentUser.set({ email: payload.email, sub: payload.sub, role: payload.role, name: payload.name });
      } catch (e) {
        this.currentUser.set(null);
      }
    } else {
      this.currentUser.set(null);
    }
  }

  logout() {
    localStorage.removeItem('access_token');
    this.currentUser.set(null);
  }

  private saveToken(response: AuthResponse) {
    if (response && response.access_token) {
      localStorage.setItem('access_token', response.access_token);
      this.loadUserFromToken();
    }
  }

  updateProfile(name?: string, email?: string) {
    return firstValueFrom(
      this.http.patch<AuthResponse>(`${this.apiUrl}/profile`, { name, email }).pipe(
        tap(res => this.saveToken(res))
      )
    );
  }

  login(email: string, password?: string) {
    return firstValueFrom(
      this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
        tap(res => this.saveToken(res))
      )
    );
  }

  register(email: string, password?: string) {
    return firstValueFrom(
      this.http.post<AuthResponse>(`${this.apiUrl}/register`, { email, password }).pipe(
        tap(res => this.saveToken(res))
      )
    );
  }

  async loginWithPasskey(email: string) {
    // 1) Pegar opções
    const options = await firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/passkey/options`, { email })
    );

    // 2) Chamar biometria no browser
    const asseResp = await startAuthentication({ optionsJSON: options });

    // 3) Verificar e pegar JWT
    const verifyRes = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.apiUrl}/passkey/verify`, {
        email,
        clientResponse: asseResp
      }).pipe(
        tap(res => this.saveToken(res))
      )
    );

    return verifyRes;
  }

  async registerPasskey() {
    // 1) Pegar opções (o backend usa o usuário do token)
    const options = await firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/passkey/register/options`, {})
    );

    // 2) Chamar biometria no browser
    const attResp = await startRegistration({ optionsJSON: options });

    // 3) Verificar e vincular a passkey à conta logada
    return firstValueFrom(
      this.http.post<{ verified: boolean }>(`${this.apiUrl}/passkey/register/verify`, {
        clientResponse: attResp
      })
    );
  }
}
