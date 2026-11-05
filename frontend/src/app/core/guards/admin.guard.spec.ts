import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adminGuard } from './admin.guard';
import { AuthService } from '../auth.service';

describe('adminGuard', () => {
  let router: Router;
  let authService: { isAdmin: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = {
      isAdmin: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: Router,
          useValue: {
            parseUrl: vi.fn((url) => ({ toString: () => url } as unknown as UrlTree)),
          },
        },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('allows access when user is admin', () => {
    authService.isAdmin.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => adminGuard());

    expect(result).toBe(true);
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it('redirects to / when user is not admin', () => {
    authService.isAdmin.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => adminGuard());

    expect(router.parseUrl).toHaveBeenCalledWith('/');
    expect(result).toEqual({ toString: expect.any(Function) });
  });
});
