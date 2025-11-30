import { Router } from 'express';
import { cryptoNewsService } from '../services/crypto-news.service';

const router = Router();

/**
 * GET /api/news
 * Get crypto news with optional filters
 * Query params:
 * - tickers: comma-separated list (e.g., BTC,ETH,XRP)
 * - sentiment: positive, negative, or neutral
 * - type: article or video
 * - source: news source name
 * - sortby: rank or oldestfirst
 * - days: number of days (for rank sorting)
 * - items: number of items per page (default: 3, max: 3 for free plan)
 * - page: page number (default: 1)
 * - category: 'general' for general news, or omit for ticker-specific
 */
router.get('/', async (req, res) => {
  try {
    const {
      tickers,
      sentiment,
      type,
      source,
      sortby,
      days,
      items,
      page,
      category,
    } = req.query;

    // Free plan limit: max 3 items per request
    const requestedItems = items ? parseInt(items as string) : 3;
    const maxItems = Math.min(requestedItems, 3);
    
    const filters: any = {
      items: maxItems,
      page: page ? parseInt(page as string) : 1,
    };

    if (tickers && typeof tickers === 'string') {
      filters.tickers = tickers.split(',').map((t: string) => t.trim().toUpperCase());
    }

    if (sentiment && typeof sentiment === 'string') {
      filters.sentiment = sentiment.toLowerCase();
    }

    if (type && typeof type === 'string') {
      filters.type = type.toLowerCase();
    }

    if (source && typeof source === 'string') {
      filters.source = source;
    }

    if (sortby && typeof sortby === 'string') {
      filters.sortby = sortby.toLowerCase();
    }

    if (days && typeof days === 'string') {
      filters.days = parseInt(days);
    }

    console.log('[News] Fetching news with filters:', filters);

    let response;
    if (category === 'general') {
      response = await cryptoNewsService.getGeneralNews(filters);
    } else {
      response = await cryptoNewsService.getNews(filters);
    }

    // If there's an error (like API limit), include it in the response
    if (response.error) {
      return res.status(200).json({
        ...response,
        warning: 'Free plan limitation: Maximum 3 news items per request',
      });
    }

    res.json(response);
  } catch (error: any) {
    console.error('[News] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch news' });
  }
});

/**
 * GET /api/news/trending
 * Get trending news (ranked by importance)
 */
router.get('/trending', async (req, res) => {
  try {
    const { tickers, limit } = req.query;

    const tickerArray = tickers && typeof tickers === 'string'
      ? tickers.split(',').map((t: string) => t.trim().toUpperCase())
      : undefined;

    // Free plan limit: max 3 items
    const requestedLimit = limit ? parseInt(limit as string) : 3;
    const newsLimit = Math.min(requestedLimit, 3);

    const news = await cryptoNewsService.getTrendingNews(tickerArray, newsLimit);

    res.json({ data: news });
  } catch (error: any) {
    console.error('[News] Error fetching trending:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch trending news' });
  }
});

export default router;

