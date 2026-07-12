import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface FeedSubscriptionPayload {
  url: string;
  name?: string;
  tags?: string[];
  isPrivate?: boolean;
  selectors?: any;
  authStorageState?: string;
}

export interface FeedSubscription {
  id?: string;
  customName?: string;
  tags?: string[];
  source?: {
    id: string;
    url: string;
    name: string;
    selectors?: any;
    type?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class FeedsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/feeds';

  getSubscriptions() {
    return firstValueFrom(this.http.get<FeedSubscription[]>(this.apiUrl));
  }

  getArticles(tag?: string) {
    const params = tag ? `?tag=${tag}` : '';
    return firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/articles${params}`));
  }

  subscribe(payload: FeedSubscriptionPayload) {
    return firstValueFrom(
      this.http.post<FeedSubscription>(`${this.apiUrl}/subscribe`, payload)
    );
  }

  updateSubscription(id: string, data: { customName?: string; tags?: string[]; url?: string; selectors?: any }) {
    return firstValueFrom(
      this.http.patch<FeedSubscription>(`${this.apiUrl}/${id}`, data)
    );
  }

  async refreshSubscription(id: string) {
    return firstValueFrom(
      this.http.post<{ success: boolean }>(`${this.apiUrl}/${id}/refresh`, {})
    );
  }

  async deleteSubscription(id: string) {
    return firstValueFrom(
      this.http.delete(`${this.apiUrl}/${id}`)
    );
  }
}
