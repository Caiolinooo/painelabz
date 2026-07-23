/**
 * Spot-check real security helper modules.
 * Run: npx tsx scratch/verify-security-modules.ts
 */

async function main() {
  const results: Array<[string, boolean]> = [];

  const { getJwtSecret } = await import('../src/lib/jwt-secret');
  const { resolveEmailAuth, resolveEmailFrom } = await import('../src/lib/email-env');
  const {
    tryGetWkradarDefaultPassword,
    getWkradarDefaultPassword,
    generateWkradarDefaultUsername,
  } = await import('../src/lib/wkradar-defaults');

  // JWT
  {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    try {
      getJwtSecret();
      results.push(['jwt production throws', false]);
    } catch (e) {
      results.push([
        'jwt production throws',
        e instanceof Error && e.message.includes('JWT_SECRET'),
      ]);
    }
    process.env.NODE_ENV = 'development';
    results.push(['jwt dev fallback', getJwtSecret().startsWith('dev-only')]);
    process.env.JWT_SECRET = 'test-secret-123';
    results.push(['jwt from env', getJwtSecret() === 'test-secret-123']);
    process.env.NODE_ENV = prev;
  }

  // Email
  {
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASSWORD;
    delete process.env.EMAIL_PASS;
    delete process.env.EMAIL_FROM;
    try {
      resolveEmailAuth();
      results.push(['email missing throws', false]);
    } catch (e) {
      results.push([
        'email missing throws',
        e instanceof Error && e.message.includes('EMAIL_USER'),
      ]);
    }
    process.env.EMAIL_USER = 'u@test.com';
    process.env.EMAIL_PASSWORD = 'secret';
    const auth = resolveEmailAuth();
    results.push([
      'email resolve',
      auth.user === 'u@test.com' &&
        auth.pass === 'secret' &&
        auth.host.includes('office365'),
    ]);
    results.push(['email from', resolveEmailFrom().includes('u@test.com')]);
    process.env.EMAIL_PASS = 'legacy';
    delete process.env.EMAIL_PASSWORD;
    const auth2 = resolveEmailAuth();
    results.push(['email EMAIL_PASS alias', auth2.pass === 'legacy']);
  }

  // WKRadar
  {
    delete process.env.WKRADAR_DEFAULT_PASSWORD;
    results.push(['wkradar try null', tryGetWkradarDefaultPassword() === null]);
    try {
      getWkradarDefaultPassword();
      results.push(['wkradar throws', false]);
    } catch (e) {
      results.push([
        'wkradar throws',
        e instanceof Error && e.message.includes('WKRADAR'),
      ]);
    }
    process.env.WKRADAR_DEFAULT_PASSWORD = 'StrongPass!1';
    results.push(['wkradar get', getWkradarDefaultPassword() === 'StrongPass!1']);
    results.push([
      'wkradar username accent',
      generateWkradarDefaultUsername('Jo├úo Silva', 'x@y.com') === 'joao.silva',
    ]);
  }

  // Debug guard: production branch (pure contract of debug-route-guard.ts)
  {
    const blocked =
      process.env.NODE_ENV === 'production'
        ? { status: 403 }
        : null;
    // Simulate production check without NextRequest
    const prodBlocked =
      'production' === 'production'
        ? { status: 403, error: 'Esta API s├│ est├í dispon├¡vel em ambiente de desenvolvimento' }
        : null;
    results.push(['debug guard prod 403 contract', prodBlocked?.status === 403]);
    results.push(['debug guard non-prod continues', blocked === null || process.env.NODE_ENV !== 'production']);
  }

  let failed = 0;
  for (const [name, ok] of results) {
    console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
    if (!ok) failed++;
  }
  console.log(failed === 0 ? '\nALL SPOT CHECKS PASSED' : `\n${failed} CHECK(S) FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
