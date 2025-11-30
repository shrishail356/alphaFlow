import axios from 'axios';
import { env } from '../config/env';

const CRYPTO_NEWS_API_BASE = 'https://cryptonews-api.com/api/v1';
const CRYPTO_NEWS_TOKEN = 'xzhhvuvbprrhkz4pphglymj9jwdjxcchwhdytm7t';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const TRENDING_CACHE_TTL = 10 * 60 * 1000; // 10 minutes for trending news

interface CacheEntry {
  data: CryptoNewsResponse;
  timestamp: number;
  ttl: number;
}

// In-memory cache
const newsCache = new Map<string, CacheEntry>();

/**
 * Generate cache key from filters
 */
function generateCacheKey(filters: NewsFilters, category?: string): string {
  const keyParts = [
    category || 'ticker',
    filters.tickers?.sort().join(',') || 'all',
    filters.sentiment || 'all',
    filters.type || 'all',
    filters.source || 'all',
    filters.sortby || 'default',
    filters.days?.toString() || '',
    filters.items?.toString() || '20',
    filters.page?.toString() || '1',
  ];
  return keyParts.join('|');
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < entry.ttl;
}

/**
 * Get cached data if available and valid
 */
function getCached(key: string): CryptoNewsResponse | null {
  const entry = newsCache.get(key);
  if (entry && isCacheValid(entry)) {
    console.log('[CryptoNews] Cache hit for key:', key);
    return entry.data;
  }
  if (entry) {
    console.log('[CryptoNews] Cache expired for key:', key);
    newsCache.delete(key);
  }
  return null;
}

/**
 * Set cache entry
 */
function setCache(key: string, data: CryptoNewsResponse, ttl: number = CACHE_TTL): void {
  newsCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
  console.log('[CryptoNews] Cached data for key:', key, 'TTL:', ttl / 1000, 'seconds');
}

/**
 * Clear expired cache entries (cleanup)
 */
function cleanupCache(): void {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of newsCache.entries()) {
    if (!isCacheValid(entry)) {
      newsCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log('[CryptoNews] Cleaned up', cleaned, 'expired cache entries');
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupCache, 10 * 60 * 1000);

export interface CryptoNewsItem {
  news_url: string;
  image_url: string;
  title: string;
  text: string;
  source_name: string;
  date: string;
  topics: string[];
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  type: 'Article' | 'Video';
  tickers?: string[];
}

export interface CryptoNewsResponse {
  data: CryptoNewsItem[];
  total_pages: number;
  total_items: number;
  error?: string; // Optional error message for API limitations
}

export interface NewsFilters {
  tickers?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  type?: 'article' | 'video';
  source?: string;
  sortby?: 'rank' | 'oldestfirst';
  days?: number;
  items?: number;
  page?: number;
}

export class CryptoNewsService {
  /**
   * Get crypto news with filters
   */
  async getNews(filters: NewsFilters = {}): Promise<CryptoNewsResponse> {
    try {
      // Check cache first
      const cacheKey = generateCacheKey(filters, 'ticker');
      const cached = getCached(cacheKey);
      if (cached) {
        return cached;
      }

      // Free plan limit: max 3 items per request
      const maxItems = Math.min(filters.items || 3, 3);
      
      const params: any = {
        token: CRYPTO_NEWS_TOKEN,
        items: maxItems,
        page: filters.page || 1,
      };

      // Build ticker parameter
      if (filters.tickers && filters.tickers.length > 0) {
        params.tickers = filters.tickers.join(',');
      }

      // Add sentiment filter
      if (filters.sentiment) {
        params.sentiment = filters.sentiment;
      }

      // Add type filter
      if (filters.type) {
        params.type = filters.type;
      }

      // Add source filter
      if (filters.source) {
        params.source = filters.source;
      }

      // Add sort options
      if (filters.sortby) {
        params.sortby = filters.sortby;
        if (filters.days) {
          params.days = filters.days;
        }
      }

      console.log('[CryptoNews] Fetching from API with params:', params);
      const response = await axios.get(`${CRYPTO_NEWS_API_BASE}`, { params });

      const result: CryptoNewsResponse = {
        data: response.data.data || [],
        total_pages: response.data.total_pages || 0,
        total_items: response.data.total_items || 0,
      };

      // Cache the result
      setCache(cacheKey, result);

      return result;
    } catch (error: any) {
      // Handle 403 errors (free plan limitations)
      if (error.response?.status === 403) {
        const errorMessage = error.response?.data?.message || 'API request limit reached';
        console.error('[CryptoNews] API limit error:', errorMessage);
        
        // Return empty result with error info instead of throwing
        return {
          data: [],
          total_pages: 0,
          total_items: 0,
          error: errorMessage,
        };
      }
      
      console.error('[CryptoNews] Error fetching news:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get general crypto news
   */
  async getGeneralNews(filters: NewsFilters = {}): Promise<CryptoNewsResponse> {
    try {
      // Check cache first
      const cacheKey = generateCacheKey(filters, 'general');
      const cached = getCached(cacheKey);
      if (cached) {
        return cached;
      }

      // Free plan limit: max 3 items per request
      const maxItems = Math.min(filters.items || 3, 3);
      
      const params: any = {
        token: CRYPTO_NEWS_TOKEN,
        items: maxItems,
        page: filters.page || 1,
        section: 'general',
      };

      if (filters.sentiment) {
        params.sentiment = filters.sentiment;
      }

      if (filters.type) {
        params.type = filters.type;
      }

      console.log('[CryptoNews] Fetching general news from API with params:', params);
      const response = await axios.get(`${CRYPTO_NEWS_API_BASE}/category`, { params });

      const result: CryptoNewsResponse = {
        data: response.data.data || [],
        total_pages: response.data.total_pages || 0,
        total_items: response.data.total_items || 0,
      };

      // Cache the result
      setCache(cacheKey, result);

      return result;
    } catch (error: any) {
      // Handle 403 errors (free plan limitations)
      if (error.response?.status === 403) {
        const errorMessage = error.response?.data?.message || 'API request limit reached';
        console.error('[CryptoNews] API limit error:', errorMessage);
        
        // Return empty result with error info instead of throwing
        return {
          data: [],
          total_pages: 0,
          total_items: 0,
          error: errorMessage,
        };
      }
      
      console.error('[CryptoNews] Error fetching general news:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get trending news (sorted by rank)
   */
  async getTrendingNews(tickers?: string[], limit: number = 3): Promise<CryptoNewsItem[]> {
    try {
      // Free plan limit: max 3 items
      const maxLimit = Math.min(limit, 3);
      
      // Check cache first with longer TTL for trending
      const filters: NewsFilters = {
        tickers,
        sortby: 'rank',
        days: 3,
        items: maxLimit,
        page: 1,
      };

      const cacheKey = generateCacheKey(filters, 'trending');
      const cached = getCached(cacheKey);
      if (cached) {
        return cached.data;
      }

      const response = await this.getNews(filters);
      
      // Cache trending news with longer TTL
      const trendingResult: CryptoNewsResponse = {
        data: response.data,
        total_pages: response.total_pages,
        total_items: response.total_items,
      };
      setCache(cacheKey, trendingResult, TRENDING_CACHE_TTL);
      
      return response.data;
    } catch (error: any) {
      console.error('[CryptoNews] Error fetching trending news:', error);
      return [];
    }
  }
}

export const cryptoNewsService = new CryptoNewsService();

