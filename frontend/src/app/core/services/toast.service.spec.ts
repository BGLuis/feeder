import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToastService],
    });
    service = TestBed.inject(ToastService);
  });

  it('pushes success toast and dismisses it', () => {
    const id = service.success('Test Toast', { description: 'Detail' });
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].title).toBe('Test Toast');
    expect(service.toasts()[0].kind).toBe('success');

    service.dismiss(id);
    expect(service.toasts().length).toBe(0);
  });

  it('supports actions in toast', () => {
    let actionRan = false;
    service.info('Item deleted', {
      action: {
        label: 'Undo',
        run: () => {
          actionRan = true;
        },
      },
    });

    const toast = service.toasts()[0];
    expect(toast.action).toBeDefined();
    expect(toast.action?.label).toBe('Undo');
    toast.action?.run();
    expect(actionRan).toBe(true);
  });

  it('pauses and resumes timer without throwing', () => {
    const id = service.success('Auto dismiss test', { duration: 1000 });
    service.pause(id);
    service.resume(id);
    expect(service.toasts().length).toBe(1);
    service.dismiss(id);
  });
});
