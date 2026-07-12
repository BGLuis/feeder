import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FeedsService } from './feeds.service';

describe('FeedsService', () => {
  let service: FeedsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FeedsService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(FeedsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should fetch subscriptions', async () => {
    const mockFeeds = [{ id: '1', url: 'https://example.com' }];
    const promise = service.getSubscriptions();
    
    const req = httpTesting.expectOne('http://localhost:3000/feeds');
    expect(req.request.method).toBe('GET');
    req.flush(mockFeeds);

    const result = await promise;
    expect(result).toEqual(mockFeeds as any);
  });

  it('should propagate 500 error on fetch failure', async () => {
    const promise = service.getSubscriptions();
    const req = httpTesting.expectOne('http://localhost:3000/feeds');
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

    try {
      await promise;
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.status).toBe(500);
    }
  });
});
