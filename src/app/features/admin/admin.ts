import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LockerService, Locker } from '../../core/services/locker.service';
import { MessageService, UserMessage } from '../../core/services/message.service';
import { UiService } from '../../core/services/ui.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit {
  readonly auth = inject(AuthService);
  private readonly lockerService = inject(LockerService);
  private readonly messageService = inject(MessageService);
  private readonly uiService = inject(UiService);

  messages = signal<UserMessage[]>([]);
  lockers = signal<Locker[]>([]);
  
  // Pestaña activa en el panel de administración
  activeTab = signal<'messages' | 'lockers'>('messages');

  // Formulario para Crear Casillero
  newLockerNumber = '';
  newLockerSize = 'PEQUEÑO';
  newLockerPrice = 2.50;
  lockerSuccess = signal('');
  lockerError = signal('');

  // Verificación de mensajes
  selectedMessage = signal<UserMessage | null>(null);
  adminResponseText = '';

  private refreshInterval: any;

  ngOnInit() {
    this.auth.fetchProfile().subscribe({
      next: () => {
        this.loadData();
        // Auto-refresh lockers y mensajes cada 5 segundos
        this.refreshInterval = setInterval(() => this.loadData(), 5000);
      },
      error: () => this.auth.logout()
    });
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadData() {
    this.messageService.getAllMessagesAdmin().subscribe({
      next: (res) => this.messages.set(res),
      error: (err) => console.error('Error cargando mensajes de administrador:', err)
    });

    this.lockerService.getLockers().subscribe({
      next: (res) => this.lockers.set(res),
      error: (err) => console.error('Error cargando casilleros:', err)
    });
  }

  // Crear Casillero
  onCreateLocker() {
    if (!this.newLockerNumber || !this.newLockerSize || this.newLockerPrice <= 0) {
      this.lockerError.set('Ingrese datos válidos.');
      return;
    }

    this.lockerSuccess.set('');
    this.lockerError.set('');

    this.lockerService.createLocker(this.newLockerNumber, this.newLockerSize, this.newLockerPrice).subscribe({
      next: (res) => {
        this.lockerSuccess.set(`Casillero ${res.locker_number} creado exitosamente.`);
        this.newLockerNumber = '';
        this.loadData();
      },
      error: (err) => {
        this.lockerError.set(err.error?.detail || 'Error al crear el casillero.');
      }
    });
  }

  // Abrir modal de verificación y respuesta
  openVerifyModal(msg: UserMessage) {
    this.selectedMessage.set(msg);
    this.adminResponseText = msg.response || '';
  }

  closeVerifyModal() {
    this.selectedMessage.set(null);
    this.adminResponseText = '';
  }

  // Confirmar verificación del mensaje
  verifySelectedMessage() {
    const msg = this.selectedMessage();
    if (!msg) return;

    this.messageService.verifyMessage(msg.id, this.adminResponseText).subscribe({
      next: () => {
        this.closeVerifyModal();
        this.loadData();
      },
      error: (err) => {
        this.uiService.alert(err.error?.detail || 'Error al verificar el mensaje.');
      }
    });
  }

  getPendingLockers(): Locker[] {
    return this.lockers().filter(l => l.status === 'ESPERANDO_VERIFICACION');
  }

  approveLocker(lockerId: number) {
    this.uiService.confirm('¿Aprobar el comprobante de pago e iniciar el uso de este casillero?', () => {
      this.lockerService.approveRental(lockerId).subscribe({
        next: () => this.loadData(),
        error: (err) => this.uiService.alert(err.error?.detail || 'Error al aprobar.')
      });
    });
  }

  rejectLocker(lockerId: number) {
    this.uiService.confirm('¿Rechazar el comprobante? El casillero volverá a estar disponible.', () => {
      this.lockerService.rejectRental(lockerId).subscribe({
        next: () => this.loadData(),
        error: (err) => this.uiService.alert(err.error?.detail || 'Error al rechazar.')
      });
    });
  }

  lockLockerAdmin(lockerId: number) {
    this.lockerService.lockLockerAdmin(lockerId).subscribe({
      next: () => this.loadData(),
      error: (err) => this.uiService.alert(err.error?.detail || 'Error al bloquear el casillero.')
    });
  }

  unlockLockerAdmin(lockerId: number) {
    this.lockerService.unlockLockerAdmin(lockerId).subscribe({
      next: () => this.loadData(),
      error: (err) => this.uiService.alert(err.error?.detail || 'Error al desbloquear el casillero.')
    });
  }

  releaseLockerAdmin(lockerId: number) {
    this.uiService.confirm('¿Está seguro de que desea liberar este casillero? Esto finalizará el alquiler actual.', () => {
      this.lockerService.releaseLocker(lockerId).subscribe({
        next: () => {
          this.uiService.alert('Casillero liberado correctamente.');
          this.loadData();
        },
        error: (err) => this.uiService.alert(err.error?.detail || 'Error al liberar el casillero.')
      });
    });
  }

  logout() {
    this.auth.logout();
  }
}
