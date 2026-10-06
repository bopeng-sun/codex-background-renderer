// Reuse proxies the user already configured, only for the launched app process.
function httpProxy(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.includes('://') ? value.trim() : `http://${value.trim()}`);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) return null;
    return url.href;
  } catch { return null; }
}

export function configuredProxies(settings = {}) {
  if (!settings.enabled || typeof settings.server !== 'string') return {};
  const server = settings.server.trim();
  if (!server.includes('=')) {
    const proxy = httpProxy(server);
    return proxy ? {http: proxy, https: proxy} : {};
  }
  const entries = Object.fromEntries(server.split(';').map(part => {
    const index = part.indexOf('=');
    return [part.slice(0, index).trim().toLowerCase(), httpProxy(part.slice(index + 1))];
  }));
  return {http: entries.http || null, https: entries.https || entries.http || null};
}

export function launchEnvironment(settings = {}, environment = {}) {
  const result = {...environment}, proxies = configuredProxies(settings);
  if (!(result.HTTP_PROXY || result.http_proxy) && proxies.http) result.HTTP_PROXY = proxies.http;
  if (!(result.HTTPS_PROXY || result.https_proxy) && proxies.https) result.HTTPS_PROXY = proxies.https;
  const proxy = result.HTTPS_PROXY || result.https_proxy || result.HTTP_PROXY || result.http_proxy;
  if (httpProxy(proxy)) {
    if (result.NODE_USE_ENV_PROXY === undefined) result.NODE_USE_ENV_PROXY = '1';
    if (!(result.NO_PROXY || result.no_proxy)) result.NO_PROXY = 'localhost,127.0.0.1,::1';
  }
  return result;
}
