import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LockerService, Locker } from '../../core/services/locker.service';
import { MessageService, UserMessage } from '../../core/services/message.service';
import { UiService } from '../../core/services/ui.service';

@Component({
  selector: 'app-client',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client.html',
  styleUrl: './client.css'
})
export class Client implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  private readonly lockerService = inject(LockerService);
  private refreshInterval: any;
  private readonly messageService = inject(MessageService);
  private readonly uiService = inject(UiService);

  lockers = signal<Locker[]>([]);
  myMessages = signal<UserMessage[]>([]);
  
  // Pestaña activa en la interfaz móvil
  activeTab = signal<'lockers' | 'messages' | 'profile'>('lockers');

  // Control del modal de renta
  selectedLocker = signal<Locker | null>(null);
  rentHours = 1.0; 
  customHours = 8.0;
  discountCode = '';
  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;
  promoWarning = '';
  bookingError = '';

  // Control del modal de pago/extensión
  extendingLocker = signal<Locker | null>(null);
  extendHours = 1.0;
  selectedExtendFile: File | null = null;
  extendImagePreviewUrl: string | null = null;
  extendError = '';


  // Formulario de mensajes
  msgSubject = '';
  msgContent = '';
  msgSuccess = signal('');
  msgError = signal('');

  // Perfil
  profileName = '';
  profileStudentCode = '';
  profileSuccess = signal('');
  profileError = signal('');

  ngOnInit() {
    // Obtener los datos completos del usuario logueado (si hay sesión)
    if (this.auth.isLoggedIn()) {
      this.auth.fetchProfile().subscribe({
        next: (user) => {
          this.profileName = user.full_name;
          this.profileStudentCode = user.student_code || '';
          this.loadData();
        },
        error: () => {
          this.auth.logout();
          this.loadData();
        }
      });
    } else {
      this.loadData();
    }
    // Auto‑refresh lockers every 5 s
    this.refreshInterval = setInterval(() => this.loadData(), 5000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  onUpdateProfile() {
    this.profileSuccess.set('');
    this.profileError.set('');

    this.auth.updateProfile(this.profileName, this.profileStudentCode).subscribe({
      next: (user) => {
        this.profileSuccess.set('Perfil actualizado correctamente.');
        this.profileName = user.full_name;
        this.profileStudentCode = user.student_code || '';
      },
      error: (err) => {
        this.profileError.set(err.error?.detail || 'Error al actualizar el perfil.');
      }
    });
  }

  loadData() {
    this.lockerService.getLockers().subscribe({
      next: (res) => this.lockers.set(res),
      error: (err) => console.error('Error al cargar casilleros:', err)
    });

    if (this.auth.isLoggedIn()) {
      this.messageService.getMyMessages().subscribe({
        next: (res) => this.myMessages.set(res),
        error: (err) => console.error('Error al cargar mensajes:', err)
      });
    }
  }

  // Filtrar casilleros pertenecientes al cliente actual
  getMyLockers(): Locker[] {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return [];
    return this.lockers().filter(l => l.assigned_user_id === userId);
  }

  // Filtrar casilleros libres disponibles
  getAvailableLockers(): Locker[] {
    return this.lockers().filter(l => l.status === 'DISPONIBLE');
  }

  // Abrir modal de renta
  openRentModal(locker: Locker) {
    this.selectedLocker.set(locker);
    this.rentHours = 1.0;
    this.customHours = 8.0;
    this.discountCode = '';
    this.selectedFile = null;
    this.imagePreviewUrl = null;
    this.promoWarning = '';
    this.bookingError = '';
  }

  closeRentModal() {
    this.selectedLocker.set(null);
    this.selectedFile = null;
    this.imagePreviewUrl = null;
  }

  // Manejar la selección del archivo de comprobante
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreviewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  // Calcular precio: 1 Bs por cada 30 min (2 Bs por hora)
  calculatePrice(): number {
    const hrs = this.rentHours || 0.0;
    let basePrice = hrs * 2.0;
    
    // Aplicar descuento si está logueado y hay promo válida
    if (this.auth.isLoggedIn() && this.discountCode) {
      const code = this.discountCode.toUpperCase().trim();
      if (code === 'UPSA') {
        basePrice = 0.0;
      } else if (code === 'PROMO50') {
        basePrice = basePrice * 0.5;
      }
    }
    return basePrice;
  }

  // Obtener ruta del código QR de pago según el tiempo
  getPaymentQR(): string {
    const hrs = this.rentHours || 0.0;
    if (hrs === 0.5) {
      return 'assets/qr/qr_30min.png';
    }
    if (hrs === 1.0) {
      return 'assets/qr/qr_1hora.png';
    }
    return 'assets/qr/qr_custom_new.png';
  }

  // Verificar código de descuento
  applyDiscount() {
    this.promoWarning = '';
    if (!this.auth.isLoggedIn()) {
      this.promoWarning = '⚠️ Debes iniciar sesión para aplicar códigos de descuento.';
      return;
    }
    const code = this.discountCode.toUpperCase().trim();
    if (code !== 'UPSA' && code !== 'PROMO50') {
      this.promoWarning = '❌ Código inválido. Intenta con UPSA o PROMO50.';
    } else {
      this.promoWarning = '✔️ ¡Código aplicado correctamente!';
    }
  }

  // Confirmar renta de casillero (público)
  rentSelectedLocker() {
    const locker = this.selectedLocker();
    if (!locker) return;

    const price = this.calculatePrice();
    if (price > 0 && !this.selectedFile) {
      this.uiService.alert('Por favor, selecciona una foto de tu comprobante de pago.');
      return;
    }

    const finalHours = this.rentHours || 0.0;
    if (finalHours <= 0) {
      this.uiService.alert('Por favor, ingresa una duración válida.');
      return;
    }

    const appliedCode = (this.auth.isLoggedIn() && this.discountCode) ? this.discountCode : null;

    this.bookingError = '';
    this.lockerService.rentLockerPublic(locker.id, finalHours, appliedCode, this.selectedFile).subscribe({
      next: (res) => {
        if (res.status === 'ESPERANDO_VERIFICACION') {
          this.uiService.alert(`¡Comprobante enviado exitosamente!\n\nTu solicitud para el casillero ${res.locker_number} ha sido enviada.\nEl administrador verificará tu pago y aprobará el uso en breve.`);
        } else {
          this.uiService.alert(`¡Casillero ${res.locker_number} alquilado exitosamente!\n\nTu PIN de acceso físico es: ${res.pin_code}\n\nPor favor anota este PIN, lo necesitarás para abrir tu casillero.`);
        }
        this.closeRentModal();
        this.loadData();
      },
      error: (err) => {
        this.bookingError = err.error?.detail || 'Error al procesar el alquiler.';
      }
    });
  }

  // Liberar casillero
  releaseLocker(locker: Locker) {
    this.uiService.confirm(`¿Está seguro de que desea liberar el casillero ${locker.locker_number}?`, () => {
      this.lockerService.releaseLocker(locker.id).subscribe({
        next: () => {
          this.loadData();
        },
        error: (err) => {
          this.uiService.alert(err.error?.detail || 'Error al liberar el casillero.');
        }
      });
    });
  }

  // Abrir modal para pagar/extender
  openExtendModal(locker: Locker) {
    this.extendingLocker.set(locker);
    this.extendHours = 1.0;
    this.selectedExtendFile = null;
    this.extendImagePreviewUrl = null;
    this.extendError = '';
  }

  closeExtendModal() {
    this.extendingLocker.set(null);
    this.selectedExtendFile = null;
    this.extendImagePreviewUrl = null;
    this.extendError = '';
  }

  onExtendFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedExtendFile = input.files[0];
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.extendImagePreviewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedExtendFile);
    }
  }

  getExtendPaymentQR(): string {
    const hrs = this.extendHours || 0.0;
    if (hrs === 0.5) {
      return 'assets/qr/qr_30min.png';
    }
    if (hrs === 1.0) {
      return 'assets/qr/qr_1hora.png';
    }
    return 'assets/qr/qr_custom_new.png';
  }

  closeLocker(locker: Locker) {
    this.uiService.confirm(`¿Estás seguro de que deseas cerrar la puerta del casillero ${locker.locker_number}?`, () => {
      this.lockerService.closeLocker(locker.id).subscribe({
        next: () => {
          this.uiService.alert(`El casillero ${locker.locker_number} ha sido cerrado correctamente.`);
          this.loadData();
        },
        error: (err) => {
          this.uiService.alert(err.error?.detail || 'Error al cerrar el casillero.');
        }
      });
    });
  }

  // Confirmar pago y extensión de renta
  payAndExtendLocker() {
    const locker = this.extendingLocker();
    if (!locker) return;

    if (!this.selectedExtendFile) {
      this.extendError = 'Por favor, selecciona una foto de tu comprobante de pago de extensión.';
      return;
    }

    this.extendError = '';

    this.lockerService.payAndExtend(locker.id, this.extendHours, this.selectedExtendFile).subscribe({
      next: () => {
        this.uiService.alert(`¡Comprobante enviado! El administrador verificará tu pago para confirmar la extensión.`);
        this.closeExtendModal();
        this.loadData();
      },
      error: (err) => {
        this.extendError = err.error?.detail || 'Error al procesar el pago de extensión.';
      }
    });
  }


  // Enviar mensaje de soporte
  onSubmitMessage() {
    if (!this.msgSubject || !this.msgContent) {
      this.msgError.set('Por favor, rellene todos los campos del formulario.');
      return;
    }

    this.msgSuccess.set('');
    this.msgError.set('');

    this.messageService.sendMessage(this.msgSubject, this.msgContent).subscribe({
      next: (res) => {
        this.msgSuccess.set('Su mensaje ha sido enviado al administrador con éxito.');
        this.msgSubject = '';
        this.msgContent = '';
        // Recargar mensajes
        this.myMessages.update(msgs => [res, ...msgs]);
      },
      error: (err) => {
        this.msgError.set(err.error?.detail || 'Error al enviar el mensaje.');
      }
    });
  }

  logout() {
    this.auth.logout();
  }
}
