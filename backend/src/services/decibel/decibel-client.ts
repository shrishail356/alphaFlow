import axios from 'axios';
import { env } from '../../config/env';

// Create axios client
export const decibelClient = axios.create({
  baseURL: env.DECIBEL_BASE_URL,
});

// Set Authorization header if API key is provided
if (env.DECIBEL_API_KEY) {
  decibelClient.defaults.headers.common['Authorization'] = `Bearer ${env.DECIBEL_API_KEY}`;
  console.log('[DecibelClient] Authorization header set on axios client');
  console.log('[DecibelClient] Authorization header value (first 20 chars):', `Bearer ${env.DECIBEL_API_KEY.substring(0, 20)}...`);
} else {
  console.warn('[DecibelClient] WARNING: DECIBEL_API_KEY is not set in environment!');
}

// Log API key info (first 10 chars only for security)
if (env.DECIBEL_API_KEY) {
  console.log('[DecibelClient] API Key configured (first 10 chars):', env.DECIBEL_API_KEY.substring(0, 10) + '...');
  console.log('[DecibelClient] API Key length:', env.DECIBEL_API_KEY.length);
  console.log('[DecibelClient] API Key last 10 chars:', '...' + env.DECIBEL_API_KEY.substring(env.DECIBEL_API_KEY.length - 10));
} else {
  console.warn('[DecibelClient] WARNING: DECIBEL_API_KEY is not set!');
}

// Helper to get request headers
export function getDecibelHeaders(includeAuth: boolean = false) {
  return {
    ...(includeAuth && env.DECIBEL_API_KEY && { Authorization: `Bearer ${env.DECIBEL_API_KEY}` }),
    Origin: 'https://app.decibel.trade', // Required by Decibel API
  };
}

