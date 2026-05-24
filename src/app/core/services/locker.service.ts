import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Locker {
  id: number;
  locker_number: string;
  size: string; // "PEQUEÑO", "MEDIANO", "GRANDE"
  status: string; // "DISPONIBLE", "OCUPADO", "MANTENIMIENTO"
  price_per_hour: number;
  assigned_user_id?: number | null;
  occupied_until?: string | null;
  last_payment_at?: string | null;
  pin_code?: string | null;
  is_locked?: boolean;
  payment_receipt_url?: string | null;
  pending_rent_hours?: number | null;
  approved_at?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class LockerService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  getLockers(): Observable<Locker[]> {
    return this.http.get<Locker[]>(`${this.auth.apiUrl}/lockers`);
  }

  rentLocker(lockerId: number, hours: number): Observable<Locker> {
    return this.http.post<Locker>(`${this.auth.apiUrl}/lockers/${lockerId}/rent`, { hours });
  }

  releaseLocker(lockerId: number): Observable<Locker> {
    return this.http.post<Locker>(`${this.auth.apiUrl}/lockers/${lockerId}/release`, {});
  }

  payAndExtend(lockerId: number, hours: number, receipt: File): Observable<Locker> {
    const formData = new FormData();
    formData.append('hours', hours.toString());
    formData.append('receipt', receipt, receipt.name);
    return this.http.post<Locker>(`${this.auth.apiUrl}/lockers/${lockerId}/pay`, formData);
  }

  closeLocker(lockerId: number): Observable<Locker> {
    return this.http.post<Locker>(`${this.auth.apiUrl}/lockers/${lockerId}/close`, {});
  }


  createLocker(lockerNumber: string, size: string, pricePerHour: number): Observable<Locker> {
    return this.http.post<Locker>(`${this.auth.apiUrl}/lockers`, {
      locker_number: lockerNumber,
      size: size,
      price_per_hour: pricePerHour
    });
  }

  lockLockerAdmin(lockerId: number): Observable<Locker> {
    return this.http.post<Locker>(`${this.auth.apiUrl}/lockers/${lockerId}/lock-admin`, {});
  }

  unlockLockerAdmin(lockerId: number): Observable<Locker> {
    return this.http.post<Locker>(`${this.auth.apiUrl}/lockers/${lockerId}/unlock-admin`, {});
  }

  rentLockerPublic(lockerId: number, hours: number, discountCode: string | null, receipt: File | null): Observable<Locker> {
    const formData = new FormData();
    formData.append('hours', hours.toString());
    if (discountCode) {
      formData.append('discount_code', discountCode);
    }
    if (receipt) {
      formData.append('receipt', receipt, receipt.name);
    }
    return this.http.post<Locker>(`${this.auth.apiUrl}/lockers/${lockerId}/rent-public`, formData);
  }

  approveRental(lockerId: number): Observable<Locker> {
    return this.http.post<Locker>(`${this.auth.apiUrl}/lockers/${lockerId}/approve`, {});
  }

  rejectRental(lockerId: number): Observable<Locker> {
    return this.http.post<Locker>(`${this.auth.apiUrl}/lockers/${lockerId}/reject`, {});
  }
}
