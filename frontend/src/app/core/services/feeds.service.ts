import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api.token';

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
	private apiBaseUrl = inject(API_BASE_URL);
	private apiUrl = `${this.apiBaseUrl}/feeds`;

	getSubscriptions() {
		return firstValueFrom(this.http.get<FeedSubscription[]>(this.apiUrl));
	}

	getArticles(
		tag?: string,
		search?: string,
		page: number = 1,
		limit: number = 50,
	) {
		const params = new URLSearchParams();
		if (tag) params.set('tag', tag);
		if (search) params.set('search', search);
		params.set('page', page.toString());
		params.set('limit', limit.toString());

		return firstValueFrom(
			this.http.get<{
				data: any[];
				total: number;
				page: number;
				limit: number;
				totalPages: number;
			}>(`${this.apiUrl}/articles?${params.toString()}`),
		);
	}

	subscribe(payload: FeedSubscriptionPayload) {
		return firstValueFrom(
			this.http.post<FeedSubscription>(
				`${this.apiUrl}/subscribe`,
				payload,
			),
		);
	}

	updateSubscription(
		id: string,
		data: {
			customName?: string;
			tags?: string[];
			url?: string;
			selectors?: any;
		},
	) {
		return firstValueFrom(
			this.http.patch<FeedSubscription>(`${this.apiUrl}/${id}`, data),
		);
	}

	async refreshSubscription(id: string) {
		return firstValueFrom(
			this.http.post<{ success: boolean }>(
				`${this.apiUrl}/${id}/refresh`,
				{},
			),
		);
	}

	async deleteSubscription(id: string) {
		return firstValueFrom(this.http.delete(`${this.apiUrl}/${id}`));
	}
}
