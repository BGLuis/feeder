// Shared test environment. Keeps unit specs free of real infra while giving
// modules that read process.env at import/construction time sane values.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-secret-test-secret-test-secret-123456';
// exactly 64 hex chars
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ?? 'abcdef0123456789'.repeat(4);
process.env.SSRF_ALLOWED_HOSTS = process.env.SSRF_ALLOWED_HOSTS ?? '';
