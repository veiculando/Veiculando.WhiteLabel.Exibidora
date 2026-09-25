import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface AppKycQueueItem {
  id: string;
  usuarioId: number;
  tipoConta: string;
  documento: string;
  status: number;
  atualizadoEm: string;
}

export interface AppKycDetail extends AppKycQueueItem {
  motivo: string | null;
  business: Record<string, string>;
  documents: Array<{ id: string; nome: string; tipo: string; contentType: string; tamanho: number }>;
  history: Array<{ de: number; para: number; motivo: string | null; em: string }>;
}

@Injectable({ providedIn: 'root' })
export class KycAppReviewService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/kyc/app`;

  queue() { return this.http.get<AppKycQueueItem[]>(this.base); }
  detail(id: string) { return this.http.get<AppKycDetail>(`${this.base}/${id}`); }
  document(id: string, documentId: string) {
    return this.http.get(`${this.base}/${id}/documents/${documentId}`, { responseType: 'blob' });
  }
  decide(id: string, action: 'review' | 'approve' | 'adjustments' | 'reject' | 'suspend', reason?: string) {
    return this.http.post(`${this.base}/${id}/${action}`, reason ? { reason } : {});
  }
}
