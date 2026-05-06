export function getServerApiBaseUrl() {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000'
  );
}

export function getClientApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    const { hostname, origin, protocol } = window.location;
    const isPrivateNetworkHost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

    if (isPrivateNetworkHost) {
      return `${protocol}//${hostname}:8000`;
    }

    return origin.replace(/\/+$/, '');
  }

  return 'http://localhost:8000';
}
