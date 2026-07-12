import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../core/auth.service';
import { Router } from '@angular/router';

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

class MockRouter {
  navigateArgs: any[] = [];
  navigate(args: any[]) {
    this.navigateArgs = args;
  }
}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: MockAuthService;
  let routerMock: MockRouter;

  beforeEach(async () => {
    authServiceMock = new MockAuthService();
    routerMock = new MockRouter();

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

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
    expect(component.errorMessage()).toBe('Falha no login. Verifique suas credenciais.');
  });

  it('should navigate to dashboard on successful login', async () => {
    authServiceMock.loginRes = Promise.resolve({ access_token: 'fake' });
    
    component.email.set('test@test.com');
    component.password.set('correct');
    await component.onLogin();
    
    expect(routerMock.navigateArgs).toEqual(['/']);
    expect(component.errorMessage()).toBe('');
  });

  it('should require email for passkey login', async () => {
    component.email.set('');
    await component.onLoginWithPasskey();
    
    expect(authServiceMock.loginWithPasskeyArgs).toEqual([]);
    expect(component.errorMessage()).toBe('Informe seu email para usar Passkey.');
  });
});
