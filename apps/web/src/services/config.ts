export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export const API_ROOT = `${API_BASE_URL}/api`;
