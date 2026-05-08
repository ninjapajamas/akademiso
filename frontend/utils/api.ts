export function getServerApiBaseUrl() {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000'
  );
}

function isLocalHostName(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function getClientApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const { hostname, origin, protocol } = window.location;
    const isPrivateNetworkHost =
      isLocalHostName(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

    if (isPrivateNetworkHost) {
      return `${protocol}//${hostname}:8000`;
    }

    const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (configuredUrl) {
      try {
        const parsedUrl = new URL(configuredUrl);
        if (isLocalHostName(parsedUrl.hostname)) {
          parsedUrl.hostname = hostname;
          parsedUrl.protocol = protocol;
          return parsedUrl.toString().replace(/\/+$/, '');
        }
      } catch {
        // Fallback to the configured value when it is not a valid absolute URL.
      }

      return configuredUrl.replace(/\/+$/, '');
    }

    return origin.replace(/\/+$/, '');
  }

  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  return 'http://localhost:8000';
}
