const isProd = window.location.hostname === 'primecode.in' || window.location.hostname === 'www.primecode.in';

const API_URL = import.meta.env.VITE_API_URL || 
  (isProd ? 'https://primecode-api.onrender.com/api' : 'http://localhost:4000/api');

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (isProd ? 'https://primecode-api.onrender.com' : 'http://localhost:4000');

export { API_URL, SOCKET_URL };
