const LOCAL_API_BASE_URL = 'http://localhost:8000/api';

export function resolveApiBaseUrl(
  configuredUrl: string | undefined,
  isProduction: boolean
): string {
  const value = configuredUrl?.trim();
  if (!value) {
    if (isProduction) {
      throw new Error('VITE_API_BASE_URL is required for production builds.');
    }
    return LOCAL_API_BASE_URL;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error('VITE_API_BASE_URL must be an absolute HTTP(S) URL.');
  }

  if (
    !['http:', 'https:'].includes(parsedUrl.protocol)
    || parsedUrl.username
    || parsedUrl.password
    || parsedUrl.search
    || parsedUrl.hash
    || value.includes('?')
    || value.includes('#')
  ) {
    throw new Error('VITE_API_BASE_URL must be an absolute HTTP(S) URL without credentials or query parameters.');
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/\.$/, '');
  if (isProduction && (
    parsedUrl.protocol !== 'https:'
    || hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || /^127(?:\.\d{1,3}){3}$/.test(hostname)
    || ['0.0.0.0', '[::1]'].includes(hostname)
  )) {
    throw new Error('Production VITE_API_BASE_URL must use HTTPS and cannot point to localhost.');
  }

  return value.replace(/\/+$/, '');
}
