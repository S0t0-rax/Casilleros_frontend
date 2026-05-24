import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface UserMessage {
  id: number;
  user_id: number;
  subject: string;
  content: string;
  response?: string | null;
  status: string; // "PENDIENTE", "VERIFICADO", "RESPONDIDO"
  created_at: string;
  verified_at?: string | null;
  verified_by_id?: number | null;
  user_email?: string | null; // Solo visible para admins
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  sendMessage(subject: string, content: string): Observable<UserMessage> {
    return this.http.post<UserMessage>(`${this.auth.apiUrl}/messages`, { subject, content });
  }

  getMyMessages(): Observable<UserMessage[]> {
    return this.http.get<UserMessage[]>(`${this.auth.apiUrl}/messages/my`);
  }

  getAllMessagesAdmin(): Observable<UserMessage[]> {
    return this.http.get<UserMessage[]>(`${this.auth.apiUrl}/messages/admin`);
  }

  verifyMessage(messageId: number, responseText?: string): Observable<UserMessage> {
    return this.http.post<UserMessage>(`${this.auth.apiUrl}/messages/${messageId}/verify`, {
      response: responseText || ''
    });
  }
}
