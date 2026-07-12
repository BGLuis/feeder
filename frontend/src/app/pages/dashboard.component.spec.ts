import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { FeedsService } from '../core/services/feeds.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let feedsServiceSpy: any;

  beforeEach(async () => {
    feedsServiceSpy = {
      getSubscriptions: () => Promise.resolve([{ id: '1', name: 'Angular Blog', url: 'https://blog.angular.dev' }])
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: FeedsService, useValue: feedsServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should load feeds on init', async () => {
    fixture.detectChanges(); // ngOnInit is called
    await fixture.whenStable(); // wait for promises
    fixture.detectChanges(); // update view with signal changes

    expect(component.feeds().length).toBe(1);
    expect(component.loading()).toBe(false);
    
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Angular Blog');
  });

  it('should handle error when loading feeds', async () => {
    feedsServiceSpy.getSubscriptions = () => Promise.reject('network error');
    
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.feeds().length).toBe(0);
    expect(component.loading()).toBe(false);
    
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Você ainda não se inscreveu');
  });
});
