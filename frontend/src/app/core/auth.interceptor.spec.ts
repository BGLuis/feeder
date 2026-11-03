import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

const mockStorage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (k: string) => mockStorage[k] || null,
  setItem: (k: string, v: string) => {
    mockStorage[k] = v;
  },
  removeItem: (k: string) => {
    delete mockStorage[k];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },
} as any;

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthService,
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('attaches Bearer token to outgoing request if present', () => {
    localStorage.setItem('access_token', 'my-token');

    http.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush({});
  });

  it('on 401 logs out user, sets currentUser to null, and navigates to /login with returnUrl', () => {
    // Set an initial fake token and currentUser
    const fakePayload = btoa(JSON.stringify({ sub: 'user-1', email: 'test@example.com' }));
    const fakeToken = `header.${fakePayload}.sig`;
    localStorage.setItem('access_token', fakeToken);
    (authService as any).loadUserFromToken();
    expect(authService.currentUser()).not.toBeNull();

    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    Object.defineProperty(router, 'url', { value: '/dashboard', configurable: true });

    http.get('/api/protected').subscribe({
      next: () => {},
      error: () => {},
    });

    const req = httpMock.expectOne('/api/protected');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authService.currentUser()).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/dashboard' },
    });
  });

  it('does not redirect on 401 for /auth/login request', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    http.post('http://localhost:3000/auth/login', {}).subscribe({
      next: () => {},
      error: () => {},
    });

    const req = httpMock.expectOne('http://localhost:3000/auth/login');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('does not nest returnUrl if already on /login or /login?returnUrl=...', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    Object.defineProperty(router, 'url', { value: '/login?returnUrl=%2Freader', configurable: true });

    http.get('/api/protected').subscribe({
      next: () => {},
      error: () => {},
    });

    const req = httpMock.expectOne('/api/protected');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(navigateSpy).toHaveBeenCalledWith(['/login'], undefined);
  });
});
