// Use an explicit IPv4 loopback address for desktop pages. On Windows,
// `localhost` can resolve to IPv6 (::1) while the demo server listens on IPv4.
const remotePageHost = location.hostname;
window.REMOTE_SERVER_HOST =
  !remotePageHost || ['localhost', '::1', '[::1]'].includes(remotePageHost)
    ? '127.0.0.1'
    : remotePageHost;
window.REMOTE_SERVER_PORT = 8787;
window.REMOTE_SERVER_PROTOCOL = 'http:';
window.REMOTE_SERVER_DEMO = true;
window.REMOTE_SERVER_URL =
  `${window.REMOTE_SERVER_PROTOCOL}//${window.REMOTE_SERVER_HOST}:${window.REMOTE_SERVER_PORT}`;
