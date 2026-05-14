const APP_URL_ENV_KEYS = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
  'APP_URL',
  'PORTAL_URL',
  'URL',
  'DEPLOY_URL',
  'SITE_URL',
  'NETLIFY_SITE_URL',
  'VERCEL_URL',
  'RENDER_EXTERNAL_URL'
] as const;

type HeaderLike = Headers | { get(name: string): string | null } | null | undefined;

function normalizeBaseUrl(url?: string | null): string {
  if (!url) return '';

  const trimmed = url.trim().replace(/\/$/, '');
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1')) {
    return `http://${trimmed}`;
  }

  return `https://${trimmed}`;
}

export function getAppBaseUrl(requestHeaders?: HeaderLike): string {
  const host = requestHeaders?.get('host');
  const forwardedProto = requestHeaders?.get('x-forwarded-proto');

  if (host) {
    const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
    return normalizeBaseUrl(`${protocol}://${host}`);
  }

  // 1. STRICT PRODUCTION OVERRIDE
  // In production context (without requests, e.g. background tasks/CRONs), always prioritize the official primary domain
  // over automatically populated Netlify 'URL' or 'DEPLOY_URL' variables which leak the netlify.app subdomain.
  if (process.env.NODE_ENV === 'production') {
    const explicitOverride = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL);
    if (explicitOverride && !explicitOverride.includes('netlify.app')) {
      return explicitOverride;
    }
    return 'https://portal.groupabz.com';
  }

  for (const envKey of APP_URL_ENV_KEYS) {
    const baseUrl = normalizeBaseUrl(process.env[envKey]);
    if (baseUrl) {
      return baseUrl;
    }
  }

  return 'http://localhost:3000';
}

export function buildAppUrl(path = '', requestHeaders?: HeaderLike): string {
  const trimmedPath = path.trim();

  if (!trimmedPath) {
    return getAppBaseUrl(requestHeaders);
  }

  if (/^https?:\/\//i.test(trimmedPath)) {
    return trimmedPath;
  }

  const baseUrl = getAppBaseUrl(requestHeaders);

  return `${baseUrl}${trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`}`;
}