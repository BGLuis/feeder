import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let router: Router;
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: {
            createUrlTree: vi.fn((commands) => ({ toString: () => commands.join('/') } as unknown as UrlTree)),
          },
        },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('redirects to /login when token is missing', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, {} as any),
    );

    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toEqual({ toString: expect.any(Function) });
  });

  it('allows access when token is valid and not expired', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ sub: 'user-1', exp: futureExp }));
    localStorage.setItem('access_token', `header.${payload}.signature`);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, {} as any),
    );

    expect(result).toBe(true);
  });

  it('clears token and redirects to /login when token is expired', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const payload = btoa(JSON.stringify({ sub: 'user-1', exp: pastExp }));
    localStorage.setItem('access_token', `header.${payload}.signature`);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, {} as any),
    );

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toEqual({ toString: expect.any(Function) });
  });

  it('clears token and redirects to /login when token payload is invalid', () => {
    localStorage.setItem('access_token', 'header.not-base64-json.signature');

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, {} as any),
    );

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
