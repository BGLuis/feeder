import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info' | 'loading';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
  action?: ToastAction;
  /** ms until auto-dismiss; 0 keeps it until dismissed manually or updated. */
  duration: number;
  createdAt: number;
}

const DEFAULT_DURATION: Record<ToastKind, number> = {
  success: 4000,
  info: 4000,
  error: 6000,
  loading: 0,
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  private seq = 0;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  success(title: string, opts: Partial<Omit<Toast, 'id' | 'kind' | 'title' | 'createdAt'>> = {}) {
    return this.push('success', title, opts);
  }

  error(title: string, opts: Partial<Omit<Toast, 'id' | 'kind' | 'title' | 'createdAt'>> = {}) {
    return this.push('error', title, opts);
  }

  info(title: string, opts: Partial<Omit<Toast, 'id' | 'kind' | 'title' | 'createdAt'>> = {}) {
    return this.push('info', title, opts);
  }

  /** Shows a loading toast and resolves it to success/error when the promise settles. */
  async promise<T>(
    work: Promise<T>,
    messages: {
      loading: string;
      success: string | ((value: T) => string);
      error: string | ((err: unknown) => string);
    },
  ): Promise<T> {
    const id = this.push('loading', messages.loading);
    try {
      const value = await work;
      const text =
        typeof messages.success === 'function' ? messages.success(value) : messages.success;
      this.update(id, { kind: 'success', title: text, duration: DEFAULT_DURATION.success });
      return value;
    } catch (err) {
      const text = typeof messages.error === 'function' ? messages.error(err) : messages.error;
      this.update(id, { kind: 'error', title: text, duration: DEFAULT_DURATION.error });
      throw err;
    }
  }

  dismiss(id: number) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  /** Pauses/resumes auto-dismiss — used while the pointer is over the stack. */
  pause(id: number) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  resume(id: number) {
    const toast = this.toasts().find((t) => t.id === id);
    if (toast && toast.duration > 0 && !this.timers.has(id)) {
      this.arm(id, toast.duration);
    }
  }

  private push(
    kind: ToastKind,
    title: string,
    opts: Partial<Omit<Toast, 'id' | 'kind' | 'title' | 'createdAt'>> = {},
  ): number {
    const id = ++this.seq;
    const duration = opts.duration ?? DEFAULT_DURATION[kind];
    const toast: Toast = {
      id,
      kind,
      title,
      description: opts.description,
      action: opts.action,
      duration,
      createdAt: Date.now(),
    };
    // Keep the stack shallow: at most 3 visible, oldest drops first.
    this.toasts.update((list) => [...list.slice(-2), toast]);
    if (duration > 0) this.arm(id, duration);
    return id;
  }

  private update(id: number, patch: Partial<Toast>) {
    this.toasts.update((list) =>
      list.map((t) => (t.id === id ? { ...t, ...patch, createdAt: Date.now() } : t)),
    );
    this.pause(id);
    const next = this.toasts().find((t) => t.id === id);
    if (next && next.duration > 0) this.arm(id, next.duration);
  }

  private arm(id: number, duration: number) {
    this.timers.set(
      id,
      setTimeout(() => {
        this.timers.delete(id);
        this.dismiss(id);
      }, duration),
    );
  }
}
