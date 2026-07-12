import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

const mockStorage: any = {};
globalThis.localStorage = {
  getItem: (k: string) => mockStorage[k] || null,
  setItem: (k: string, v: string) => { mockStorage[k] = v; },
  clear: () => Object.keys(mockStorage).forEach(k => delete mockStorage[k])
} as any;

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should save token on successful login', async () => {
    const promise = service.login('test@test.com', 'password');
    const req = httpTesting.expectOne('http://localhost:3000/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({ access_token: 'fake-jwt-token' });

    await promise;
    expect(localStorage.getItem('access_token')).toBe('fake-jwt-token');
  });

  it('should propagate error on failed login', async () => {
    const promise = service.login('test@test.com', 'wrong');
    const req = httpTesting.expectOne('http://localhost:3000/auth/login');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    try {
      await promise;
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.status).toBe(401);
      expect(localStorage.getItem('access_token')).toBeNull();
    }
  });
});
