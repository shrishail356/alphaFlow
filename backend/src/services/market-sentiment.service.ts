import axios from 'axios';
import { env } from '../config/env';

export interface MarketSentiment {
  overallSentiment: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  value: number; // 0-100
  classification: string;
  timestamp: number;
  source: 'fear_greed_index';
  marketAnalysis?: {
    btc?: {
      sentiment: string;
      price?: number;
      change24h?: number;
    };
    eth?: {
      sentiment: string;
      price?: number;
      change24h?: number;
    };
  };
}

export class MarketSentimentService {
  private readonly FEAR_GREED_API = 'https://api.alternative.me/fng/';
  private readonly COINGECKO_API = 'https://api.coingecko.com/api/v3';

  /**
   * Fetch current market sentiment from Fear & Greed Index
   * Free API, no key required
   */
  async getMarketSentiment(): Promise<MarketSentiment> {
    try {
      // Fetch Fear & Greed Index
      const fngResponse = await axios.get(this.FEAR_GREED_API, {
        params: { limit: 1 },
        timeout: 10000,
      });

      const fngData = fngResponse.data?.data?.[0];
      if (!fngData) {
        throw new Error('Invalid Fear & Greed Index response');
      }

      const value = parseInt(fngData.value, 10);
      const classification = this.classifySentiment(value);

      // Optionally fetch BTC/ETH prices for context (if CoinGecko API key available)
      let marketAnalysis;
      try {
        const pricesResponse = await axios.get(`${this.COINGECKO_API}/simple/price`, {
          params: {
            ids: 'bitcoin,ethereum',
            vs_currencies: 'usd',
            include_24h_change: true,
          },
          timeout: 5000,
        });

        const prices = pricesResponse.data;
        marketAnalysis = {
          btc: {
            sentiment: this.getAssetSentiment(value, prices.bitcoin?.usd_24h_change || 0),
            price: prices.bitcoin?.usd,
            change24h: prices.bitcoin?.usd_24h_change,
          },
          eth: {
            sentiment: this.getAssetSentiment(value, prices.ethereum?.usd_24h_change || 0),
            price: prices.ethereum?.usd,
            change24h: prices.ethereum?.usd_24h_change,
          },
        };
      } catch (error) {
        console.warn('[MarketSentiment] CoinGecko API failed, continuing without price data:', error);
        // Continue without price data
      }

      return {
        overallSentiment: classification,
        value,
        classification: fngData.value_classification || classification,
        timestamp: parseInt(fngData.timestamp, 10) * 1000, // Convert to milliseconds
        source: 'fear_greed_index',
        marketAnalysis,
      };
    } catch (error: any) {
      console.error('[MarketSentiment] Error fetching sentiment:', error);
      // Return neutral sentiment as fallback
      return {
        overallSentiment: 'Neutral',
        value: 50,
        classification: 'Neutral',
        timestamp: Date.now(),
        source: 'fear_greed_index',
      };
    }
  }

  /**
   * Classify sentiment value (0-100) into categories
   */
  private classifySentiment(value: number): 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed' {
    if (value <= 20) return 'Extreme Fear';
    if (value <= 40) return 'Fear';
    if (value <= 60) return 'Neutral';
    if (value <= 80) return 'Greed';
    return 'Extreme Greed';
  }

  /**
   * Get asset-specific sentiment based on overall sentiment and price change
   */
  private getAssetSentiment(overallValue: number, priceChange24h: number): string {
    if (overallValue >= 75 && priceChange24h > 2) return 'Very Bullish';
    if (overallValue >= 60 && priceChange24h > 0) return 'Bullish';
    if (overallValue <= 25 && priceChange24h < -2) return 'Very Bearish';
    if (overallValue <= 40 && priceChange24h < 0) return 'Bearish';
    return 'Neutral';
  }
}

export const marketSentimentService = new MarketSentimentService();

