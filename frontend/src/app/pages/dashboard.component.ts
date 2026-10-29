import {
  Component,
  inject,
  signal,
  OnInit,
  computed,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FeedsService, FeedSubscription } from '../core/services/feeds.service';
import { ToastService } from '../core/services/toast.service';
import { RouterLink } from '@angular/router';
import { LucidePlus } from '@lucide/angular';
import { PageHeaderComponent } from '../ui/molecules/page-header.component';
import { StatCardComponent } from '../ui/molecules/stat-card.component';
import { SubscriptionRowComponent } from '../ui/molecules/subscription-row.component';
import { EmptyStateComponent } from '../ui/molecules/empty-state.component';
import { SkeletonComponent } from '../ui/molecules/skeleton.component';
import { SearchFieldComponent } from '../ui/atoms/search-field.component';
import { ChipComponent } from '../ui/atoms/chip.component';
import { TagComponent } from '../ui/atoms/tag.component';
import { ButtonComponent } from '../ui/atoms/button.component';
import { ModalComponent } from '../ui/organisms/modal.component';
import { CodeEditorComponent, CodeTemplate } from '../ui/atoms/code-editor.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    LucidePlus,
    PageHeaderComponent,
    StatCardComponent,
    SubscriptionRowComponent,
    EmptyStateComponent,
    SkeletonComponent,
    SearchFieldComponent,
    ChipComponent,
    TagComponent,
    ButtonComponent,
    ModalComponent,
    CodeEditorComponent,
  ],
  template: `
    <div class="max-w-6xl mx-auto">
        <!-- Page Header -->
        <app-page-header
          title="Overview"
          [subtitle]="
            loading()
              ? 'Loading your subscriptions…'
              : (feeds().length === 1 ? '1 source' : feeds().length + ' sources') +
                ' across ' +
                (tags().length === 1 ? '1 tag' : tags().length + ' tags') +
                ', processed privately.'
          "
        >
          <div actions>
            <a routerLink="/discover">
              <app-button variant="primary" size="md">
                <svg lucidePlus class="w-4 h-4"></svg>
                <span>Add Feed</span>
              </app-button>
            </a>
          </div>
        </app-page-header>

        <!-- Bento Grid Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <app-stat-card
            class="md:col-span-2"
            label="Active Subscriptions"
            [value]="loading() ? '—' : feeds().length"
            link="/discover"
            linkText="Add another feed"
            emphasis="highlight"
            description="Feeds configured and updated automatically"
          ></app-stat-card>

          <app-stat-card
            label="Tags"
            [value]="loading() ? '—' : tags().length"
            link="/reader"
            linkText="Open Timeline"
            description="Organized categories for filtering"
          ></app-stat-card>
        </div>

        <!-- Editorial Subscriptions Section -->
        <div class="space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 class="text-heading-h2 font-medium text-text-primary tracking-tight">
              Your Subscriptions
            </h2>

            <div class="w-full sm:w-72">
              <app-search-field
                [(value)]="searchQuery"
                placeholder="Search subscriptions..."
              ></app-search-field>
            </div>
          </div>

          <!-- Tag Chips -->
          @if (tags().length > 0) {
            <div
              #tagContainer
              (mousedown)="startDrag($event)"
              (mouseleave)="stopDrag()"
              (mouseup)="stopDrag()"
              (mousemove)="onDrag($event)"
              class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
            >
              <app-chip
                label="All"
                [selected]="selectedTag() === null"
                (click)="selectedTag.set(null)"
              ></app-chip>

              @for (tag of tags(); track tag) {
                <app-chip
                  [label]="tag"
                  [selected]="selectedTag() === tag"
                  (click)="selectedTag.set(tag)"
                ></app-chip>
              }
            </div>
          }

          <!-- Content: Skeleton / Empty / List -->
          @if (loading()) {
            <div class="space-y-3">
              <app-skeleton variant="row"></app-skeleton>
              <app-skeleton variant="row"></app-skeleton>
              <app-skeleton variant="row"></app-skeleton>
            </div>
          } @else if (feeds().length === 0) {
            <app-empty-state
              title="No feeds yet"
              description="You haven't subscribed to any feeds. Start exploring to populate your dashboard."
            >
              <div action>
                <a routerLink="/discover">
                  <app-button variant="primary" size="md">
                    Add your first feed
                  </app-button>
                </a>
              </div>
            </app-empty-state>
          } @else {
            <div
              class="rounded-2xl border border-border-default bg-bg-surface overflow-hidden shadow-elevation-1 divide-y divide-border-subtle"
            >
              @for (feed of filteredFeeds(); track feed.id || feed.source?.url) {
                <app-subscription-row
                  class="rise-in block"
                  [style.--i]="$index < 8 ? $index : 8"
                  [feed]="feed"
                  (refresh)="refreshFeed($event)"
                  (edit)="openEditModal($event)"
                  (delete)="deleteSubscription($event)"
                ></app-subscription-row>
              }

              @if (filteredFeeds().length === 0) {
                <div class="p-8 text-center text-text-tertiary text-sm">
                  No feeds for this tag.
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Edit Feed Modal -->
      <app-modal
        [open]="editingFeed() !== null"
        title="Edit Feed"
        subtitle="Update source name, tags, and content selectors"
        (close)="closeEditModal()"
      >
        <div class="flex flex-col gap-5 py-2">
          <!-- Feed Name -->
          <div class="flex flex-col gap-1.5">
            <label class="text-label text-text-primary">Feed Name</label>
            <input
              #editNameInput
              type="text"
              [value]="editingFeed()?.customName || editingFeed()?.source?.name || ''"
              class="w-full h-10 px-3 bg-bg-field border border-border-default rounded-lg text-text-primary text-sm focus:outline-none focus:border-border-focus focus:shadow-focus-ring transition-colors"
            />
          </div>

          <!-- Tags Input -->
          <div class="flex flex-col gap-1.5">
            <label class="text-label text-text-primary">
              Tags
              <span class="text-text-tertiary text-xs font-normal ml-1">(Press Enter or Comma)</span>
            </label>
            <div
              class="flex flex-wrap items-center gap-2 p-2 bg-bg-field border border-border-default rounded-lg min-h-[44px] focus-within:border-border-focus focus-within:shadow-focus-ring transition-colors"
            >
              @for (tag of editCurrentTags(); track tag) {
                <app-tag
                  [label]="tag"
                  tone="accent"
                  [removable]="true"
                  (remove)="removeEditTag(tag)"
                ></app-tag>
              }
              <input
                type="text"
                #editTagsInput
                (keydown.enter)="
                  $event.preventDefault();
                  addEditTag(editTagsInput.value);
                  editTagsInput.value = ''
                "
                (keydown.comma)="
                  $event.preventDefault();
                  addEditTag(editTagsInput.value);
                  editTagsInput.value = ''
                "
                (blur)="addEditTag(editTagsInput.value); editTagsInput.value = ''"
                placeholder="add tag..."
                class="flex-1 min-w-[100px] bg-transparent border-none focus:outline-none text-text-primary placeholder:text-text-tertiary text-sm px-1 py-0.5"
              />
            </div>
          </div>

          <!-- Source URL -->
          <div class="flex flex-col gap-1.5">
            <label class="text-label text-text-primary">Source URL</label>
            <input
              #editUrlInput
              type="text"
              [value]="editingFeed()?.source?.url || ''"
              class="w-full h-10 px-3 bg-bg-field border border-border-default rounded-lg text-text-primary font-mono text-xs focus:outline-none focus:border-border-focus focus:shadow-focus-ring transition-colors"
            />
          </div>

          <!-- Advanced Selectors -->
          <div class="flex flex-col gap-1.5">
            <label class="text-label text-text-primary">Advanced Selectors (JSON)</label>
            <app-code-editor
              title="HTML Selectors"
              language="json"
              height="180px"
              [code]="tempSelectorsJson"
              [templates]="selectorTemplates"
              (codeChange)="tempSelectorsJson = $event"
            ></app-code-editor>
            <p class="text-xs text-text-tertiary">Leave empty for standard RSS feeds.</p>
          </div>
        </div>

        <div footer class="flex items-center gap-3">
          <app-button
            (click)="closeEditModal()"
            variant="ghost"
            size="md"
          >
            Cancel
          </app-button>
          <app-button
            (click)="saveEdit(editNameInput.value, editUrlInput.value, tempSelectorsJson)"
            [disabled]="isSaving()"
            variant="primary"
            size="md"
          >
            @if (isSaving()) {
              <span
                class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5"
              ></span>
              Saving...
            } @else {
              Save Changes
            }
          </app-button>
        </div>
      </app-modal>
  `,
})
export class DashboardComponent implements OnInit {
  private feedsService = inject(FeedsService);
  private toast = inject(ToastService);

  feeds = signal<FeedSubscription[]>([]);
  loading = signal(true);
  selectedTag = signal<string | null>(null);
  searchQuery = signal('');

  editingFeed = signal<FeedSubscription | null>(null);
  isSaving = signal(false);

  // Drag to scroll
  @ViewChild('tagContainer') tagContainer?: ElementRef;
  private isDragging = false;
  private startX = 0;
  private scrollLeft = 0;

  tempSelectorsJson = '';

  editCurrentTags = signal<string[]>([]);

  addEditTag(tagValue: string) {
    const tag = tagValue.trim().toLowerCase();
    if (tag && !this.editCurrentTags().includes(tag)) {
      this.editCurrentTags.update((tags) => [...tags, tag]);
    }
  }

  removeEditTag(tagToRemove: string) {
    this.editCurrentTags.update((tags) => tags.filter((t) => t !== tagToRemove));
  }

  selectorTemplates: CodeTemplate[] = [
    { name: 'RSS Padrão (Limpar)', code: '' },
    {
      name: 'Artigo Simples',
      code: '{\n  "title": "h1",\n  "content": ".article-body",\n  "author": ".author-name"\n}',
    },
    {
      name: 'Medium / Substack',
      code: '{\n  "title": "h1",\n  "content": "article",\n  "date": "time"\n}',
    },
  ];

  tags = computed(() => {
    const allTags = new Set(
      this.feeds().flatMap((f) => (f.tags && f.tags.length > 0 ? f.tags : ['default'])),
    );
    return Array.from(allTags).sort();
  });

  filteredFeeds = computed(() => {
    let feeds = this.feeds();
    const tag = this.selectedTag();
    const q = this.searchQuery().toLowerCase();

    if (tag) {
      feeds = feeds.filter((f) =>
        (f.tags && f.tags.length > 0 ? f.tags : ['default']).includes(tag),
      );
    }

    if (q) {
      feeds = feeds.filter(
        (f) =>
          (f.customName || '').toLowerCase().includes(q) ||
          (f.source?.name || '').toLowerCase().includes(q) ||
          (f.source?.url || '').toLowerCase().includes(q),
      );
    }

    return feeds;
  });

  async ngOnInit() {
    this.loadFeeds();
  }

  startDrag(e: MouseEvent) {
    this.isDragging = true;
    const el = this.tagContainer?.nativeElement;
    if (!el) return;
    this.startX = e.pageX - el.offsetLeft;
    this.scrollLeft = el.scrollLeft;
  }

  stopDrag() {
    this.isDragging = false;
  }

  onDrag(e: MouseEvent) {
    if (!this.isDragging) return;
    e.preventDefault();
    const el = this.tagContainer?.nativeElement;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - this.startX) * 1.5;
    el.scrollLeft = this.scrollLeft - walk;
  }

  async loadFeeds() {
    this.loading.set(true);
    try {
      const data = await this.feedsService.getSubscriptions();
      this.feeds.set(data || []);
    } catch (err) {
      console.error('Falha ao carregar feeds', err);
      this.feeds.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  openEditModal(feed: FeedSubscription) {
    this.editingFeed.set(feed);
    this.tempSelectorsJson = this.getSelectorsJson(feed);
    this.editCurrentTags.set(feed.tags && feed.tags.length > 0 ? feed.tags : ['default']);
  }

  closeEditModal() {
    this.editingFeed.set(null);
  }

  async refreshFeed(feed: FeedSubscription) {
    const name = feed.customName || feed.source?.name || 'feed';
    try {
      await this.toast.promise(this.feedsService.refreshSubscription(feed.id!), {
        loading: `Queuing sync for ${name}…`,
        success: `${name} queued for sync`,
        error: `Could not sync ${name}`,
      });
    } catch (e) {
      console.error('Failed to force sync', e);
    }
  }

  getSelectorsJson(feed: FeedSubscription | null): string {
    if (!feed || !feed.source || !feed.source.selectors) return '';
    const sel = feed.source.selectors;
    if (typeof sel === 'string') {
      try {
        const parsed = JSON.parse(sel);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return sel;
      }
    }
    return JSON.stringify(sel, null, 2);
  }

  async saveEdit(newName: string, newUrl: string, newSelectorsStr: string) {
    const feed = this.editingFeed();
    if (!feed) return;

    let selectorsObj = undefined;
    if (newSelectorsStr && newSelectorsStr.trim() !== '') {
      try {
        selectorsObj = JSON.parse(newSelectorsStr);
      } catch (err) {
        alert('Invalid JSON format in Selectors field!');
        return;
      }
    } else if (newSelectorsStr.trim() === '') {
      selectorsObj = null;
    }

    this.isSaving.set(true);
    try {
      const tagsArray = this.editCurrentTags();
      await this.feedsService.updateSubscription(feed.id!, {
        customName: newName,
        tags: tagsArray.length > 0 ? tagsArray : ['default'],
        url: newUrl,
        selectors: selectorsObj,
      });
      await this.loadFeeds();
      this.closeEditModal();
      this.toast.success('Feed updated', { description: newName || feed.source?.name });
    } catch (e) {
      console.error(e);
      this.toast.error('Could not save changes', { description: 'Your edits were not applied.' });
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteSubscription(feed: FeedSubscription) {
    const id = feed.id!;
    const name = feed.customName || feed.source?.name || 'Subscription';
    const snapshot = this.feeds();
    this.feeds.update((list) => list.filter((f) => f.id !== id));

    let undone = false;
    this.toast.info('Subscription removed', {
      description: name,
      duration: 5000,
      action: {
        label: 'Undo',
        run: () => {
          undone = true;
          this.feeds.set(snapshot);
        },
      },
    });

    setTimeout(async () => {
      if (undone) return;
      try {
        await this.feedsService.deleteSubscription(id);
      } catch (err) {
        console.error('Failed to delete', err);
        this.feeds.set(snapshot);
        this.toast.error('Could not remove subscription', { description: name });
      }
    }, 5000);
  }
}
