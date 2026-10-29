import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArticleCardComponent } from './article-card.component';
import { AlertComponent } from './alert.component';
import { StatCardComponent } from './stat-card.component';
import { SettingRowComponent } from './setting-row.component';
import { EmptyStateComponent } from './empty-state.component';
import { SkeletonComponent } from './skeleton.component';
import { SubscriptionRowComponent } from './subscription-row.component';
import { WebhookRowComponent } from './webhook-row.component';
import { provideRouter } from '@angular/router';

@Component({
  imports: [
    ArticleCardComponent,
    AlertComponent,
    StatCardComponent,
    SettingRowComponent,
    EmptyStateComponent,
    SkeletonComponent,
    SubscriptionRowComponent,
    WebhookRowComponent,
  ],
  template: `
    <app-article-card
      [article]="mockArticle"
      [density]="cardDensity()"
      [isRead]="cardRead()"
      (markRead)="onMarkRead($event)"
      (toggleSave)="onToggleSave($event)"
    />
    <app-alert tone="danger" title="Error" description="Something went wrong" [dismissible]="true" (dismiss)="alertDismissed = true" />
    <app-stat-card label="Active Subscriptions" [value]="42" delta="+12%" link="/discover" linkText="Add feed" />
    <app-setting-row title="Private Feed" description="Hide from public" />
    <app-empty-state title="No articles found" description="Nothing here yet" />
    <app-skeleton variant="article" />
    <app-subscription-row [feed]="mockFeed" (refresh)="feedRefreshed = true" />
    <app-webhook-row [webhook]="mockWebhook" (toggleActive)="webhookToggled = $event" />
  `,
})
class TestHostComponent {
  mockArticle = {
    id: 1,
    title: 'Breaking Tech News',
    content: 'Full excerpt of breaking tech news...',
    url: 'https://example.com/article/1',
    publishedAt: new Date().toISOString(),
    source: { name: 'Tech Blog' },
  };
  mockFeed = {
    id: 1,
    customName: 'Custom Blog Name',
    tags: ['tech', 'news'],
    source: { url: 'https://tech.example.com/rss', consecutiveMisses: 0 },
  };
  mockWebhook = {
    id: 10,
    url: 'https://hooks.example.com/receive',
    isActive: true,
    triggerType: 'ALL',
  };
  cardDensity = signal<'compact' | 'comfortable' | 'magazine'>('comfortable');
  cardRead = signal(false);
  readEvents: any[] = [];
  savedEvents: any[] = [];
  alertDismissed = false;
  feedRefreshed = false;
  webhookToggled = false;

  onMarkRead(a: any) {
    this.readEvents.push(a);
  }
  onToggleSave(a: any) {
    this.savedEvents.push(a);
  }
}

describe('molecules', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('article-card shows emerald accent bar when unread, and changes text style when read', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    // When unread
    let accentBar = fixture.nativeElement.querySelector('app-article-card span.bg-emerald-500');
    expect(accentBar).toBeTruthy();

    const titleLink = fixture.nativeElement.querySelector('app-article-card h2 a') as HTMLAnchorElement;
    expect(titleLink.textContent?.trim()).toBe('Breaking Tech News');
    expect(titleLink.classList.contains('text-text-primary')).toBe(true);

    // Flip to read
    fixture.componentInstance.cardRead.set(true);
    fixture.detectChanges();

    accentBar = fixture.nativeElement.querySelector('app-article-card span.bg-emerald-500');
    expect(accentBar).toBeFalsy();
    expect(titleLink.classList.contains('text-text-secondary')).toBe(true);
  });

  it('article-card emits markRead and toggleSave events', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('app-article-card button');
    // Button 0: bookmark, Button 1: markRead
    (buttons[0] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.savedEvents.length).toBe(1);
    expect(fixture.componentInstance.readEvents.length).toBe(1);
  });

  it('alert renders title, description, and handles dismiss', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const alertEl = fixture.nativeElement.querySelector('app-alert') as HTMLElement;
    expect(alertEl.textContent).toContain('Error');
    expect(alertEl.textContent).toContain('Something went wrong');

    const dismissBtn = alertEl.querySelector('button') as HTMLButtonElement;
    expect(dismissBtn).toBeTruthy();
    dismissBtn.click();
    expect(fixture.componentInstance.alertDismissed).toBe(true);
  });

  it('stat-card displays display-stat number and label', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const statEl = fixture.nativeElement.querySelector('app-stat-card') as HTMLElement;
    expect(statEl.textContent).toContain('Active Subscriptions');
    expect(statEl.textContent).toContain('42');
    expect(statEl.textContent).toContain('+12%');
  });

  it('subscription-row displays feed title, healthy status, and emits events', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('app-subscription-row') as HTMLElement;
    expect(row.textContent).toContain('Custom Blog Name');
    expect(row.textContent).toContain('Healthy');

    const refreshBtn = row.querySelector('button[title="Force sync"]') as HTMLButtonElement;
    expect(refreshBtn).toBeTruthy();
    refreshBtn.click();
    expect(fixture.componentInstance.feedRefreshed).toBe(true);
  });

  it('webhook-row displays target url, active badge, and toggle switch', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('app-webhook-row') as HTMLElement;
    expect(row.textContent).toContain('https://hooks.example.com/receive');
    expect(row.textContent).toContain('Active');

    const toggle = row.querySelector('[role="switch"]') as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    toggle.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.webhookToggled).toBe(false);
  });
});
