import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class Auth {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isLoginMode = signal(true);
  email = '';
  password = '';
  fullName = '';
  studentCode = '';
  errorMessage = signal('');
  successMessage = signal('');
  loading = signal(false);

  toggleMode() {
    this.isLoginMode.update(val => !val);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.email = '';
    this.password = '';
    this.fullName = '';
    this.studentCode = '';
  }

  onSubmit() {
    if (!this.email || !this.password || (!this.isLoginMode() && (!this.fullName || !this.studentCode))) {
      this.errorMessage.set('Por favor, rellene todos los campos.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.isLoginMode()) {
      this.authService.login(this.email, this.password).subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.role === 'ADMIN') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err.error?.detail || 'Correo o contraseña incorrectos.');
        }
      });
    } else {
      this.authService.register(this.email, this.password, this.fullName, this.studentCode).subscribe({
        next: () => {
          this.loading.set(false);
          this.successMessage.set('¡Registro exitoso! Ya puede iniciar sesión.');
          this.isLoginMode.set(true);
          this.password = '';
          this.studentCode = '';
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err.error?.detail || 'Error al crear la cuenta. Intente nuevamente.');
        }
      });
    }
  }
}
