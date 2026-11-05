import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebhooksService } from './webhooks.service';
import { Webhook } from './entities/webhook.entity';
import { isEncrypted, decryptSecret } from '../common/crypto/secret-box';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let saved: Webhook | undefined;
  const repo = {
    save: jest.fn((w: Webhook) => {
      saved = w;
      return Promise.resolve({ ...w, id: 'w1' });
    }),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: getRepositoryToken(Webhook), useValue: repo },
      ],
    }).compile();
    service = module.get(WebhooksService);
    saved = undefined;
  });

  afterEach(() => jest.clearAllMocks());

  it('encrypts the secret at rest and never returns it on create', async () => {
    const result = await service.create('u1', {
      url: 'https://hook.example',
      secret: 'super-secret-signing-key',
    });

    expect(saved).toBeDefined();
    expect(isEncrypted(saved!.secret)).toBe(true);
    expect(saved!.secret).not.toContain('super-secret-signing-key');
    expect(decryptSecret(saved!.secret)).toBe('super-secret-signing-key');
    expect(result).not.toHaveProperty('secret');
  });

  it('auto-generates and encrypts a secret when none is supplied', async () => {
    await service.create('u1', { url: 'https://hook.example' });

    expect(isEncrypted(saved!.secret)).toBe(true);
    expect(decryptSecret(saved!.secret)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('strips the secret from every row returned by findAll', async () => {
    repo.find.mockResolvedValue([
      { id: 'w1', url: 'https://a', secret: 'v1.enc', isActive: true },
      { id: 'w2', url: 'https://b', secret: 'v1.enc', isActive: true },
    ]);

    const result = await service.findAll('u1');

    expect(result).toHaveLength(2);
    for (const w of result) {
      expect(w).not.toHaveProperty('secret');
    }
  });

  it('re-encrypts a rotated secret on update and does not return it', async () => {
    repo.findOne.mockResolvedValue({
      id: 'w1',
      url: 'https://hook.example',
      secret: 'v1.old',
      isActive: true,
    });

    const result = await service.update('u1', 'w1', {
      secret: 'a-rotated-secret-key',
    });

    expect(isEncrypted(saved!.secret)).toBe(true);
    expect(decryptSecret(saved!.secret)).toBe('a-rotated-secret-key');
    expect(result).not.toHaveProperty('secret');
  });
});
