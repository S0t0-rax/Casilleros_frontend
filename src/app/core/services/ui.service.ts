import { Injectable, signal } from '@angular/core';

export interface ModalConfig {
  type: 'alert' | 'confirm';
  message: string;
  visible: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class UiService {
  modalConfig = signal<ModalConfig | null>(null);

  alert(message: string): void {
    this.modalConfig.set({
      type: 'alert',
      message,
      visible: true,
      onConfirm: () => this.closeModal()
    });
  }

  confirm(message: string, onConfirmCallback: () => void): void {
    this.modalConfig.set({
      type: 'confirm',
      message,
      visible: true,
      onConfirm: () => {
        this.closeModal();
        onConfirmCallback();
      },
      onCancel: () => this.closeModal()
    });
  }

  closeModal(): void {
    this.modalConfig.set(null);
  }
}
