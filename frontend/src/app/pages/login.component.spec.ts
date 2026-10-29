import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../core/auth.service';
import { Router, provideRouter } from '@angular/router';

class MockAuthService {
  loginArgs: any[] = [];
  loginRes: Promise<any> = Promise.resolve({});
  loginWithPasskeyArgs: any[] = [];
  
  login(email: string, pass: string) {
    this.loginArgs = [email, pass];
    return this.loginRes;
  }
  
  loginWithPasskey(email: string) {
    this.loginWithPasskeyArgs = [email];
    return Promise.resolve({});
  }
}


describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: MockAuthService;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    authServiceMock = new MockAuthService();

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        provideRouter([])
      ]
    }).compileComponents();

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show error message on login failure', async () => {
    authServiceMock.loginRes = Promise.reject('error');
    
    component.email.set('test@test.com');
    component.password.set('wrong');
    await component.onLogin();
    
    expect(authServiceMock.loginArgs).toEqual(['test@test.com', 'wrong']);
    expect(component.errorMessage()).toBe('Invalid credentials. Please try again.');
  });

  it('should navigate to dashboard on successful login', async () => {
    authServiceMock.loginRes = Promise.resolve({ access_token: 'fake' });
    
    component.email.set('test@test.com');
    component.password.set('correct');
    await component.onLogin();
    
    expect(navigateSpy).toHaveBeenCalledWith(['/']);
    expect(component.errorMessage()).toBe('');
  });

  it('should require email for passkey login', async () => {
    component.email.set('');
    await component.onLoginWithPasskey();
    
    expect(authServiceMock.loginWithPasskeyArgs).toEqual([]);
    expect(component.errorMessage()).toBe('Please provide an email to use Passkey.');
  });
});
