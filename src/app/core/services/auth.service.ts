import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface User {
  email: string;
  full_name: string;
  role: string;
  id?: number;
  is_active?: boolean;
  student_code?: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: string;
  full_name: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  
  readonly apiUrl = `http://${window.location.hostname}:8000/api/v1`;
  
  // Señal reactiva para el usuario actual
  currentUser = signal<User | null>(null);

  constructor() {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage() {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('email');
    const role = localStorage.getItem('role');
    const fullName = localStorage.getItem('fullName');

    if (token && email && role && fullName) {
      this.currentUser.set({
        email,
        role,
        full_name: fullName
      });
    }
  }

  fetchProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/me`).pipe(
      tap(user => {
        this.currentUser.set(user);
      })
    );
  }

  login(email: string, password: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('email', res.email);
        localStorage.setItem('role', res.role);
        localStorage.setItem('fullName', res.full_name);
        
        this.currentUser.set({
          email: res.email,
          role: res.role,
          full_name: res.full_name
        });
      })
    );
  }

  register(email: string, password: string, fullName: string, studentCode?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, {
      email,
      password,
      full_name: fullName,
      student_code: studentCode || null
    });
  }

  updateProfile(fullName: string, studentCode: string): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/me`, {
      full_name: fullName,
      student_code: studentCode || null
    }).pipe(
      tap(user => {
        this.currentUser.set(user);
        localStorage.setItem('fullName', user.full_name);
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
    localStorage.removeItem('fullName');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === 'ADMIN';
  }

  isClient(): boolean {
    return this.currentUser()?.role === 'CLIENT';
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
