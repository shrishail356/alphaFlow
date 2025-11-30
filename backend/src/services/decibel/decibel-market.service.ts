import { decibelClient, getDecibelHeaders } from './decibel-client';
import { env } from '../../config/env';
import type {
  DecibelMarket,
  DecibelPrice,
  DecibelOrderBook,
  DecibelTrade,
  DecibelCandlestick,
} from './decibel-types';

export class DecibelMarketService {
  /**
   * Get all available markets
   */
  async getMarkets(): Promise<DecibelMarket[]> {
    try {
      const url = '/api/v1/markets';
      const config = {
        headers: getDecibelHeaders(false),
      };
      const response = await decibelClient.get<DecibelMarket[]>(url, config);
      return response.data;
    } catch (error: any) {
      console.error('[DecibelMarketService] Error getting markets:', error.message);
      throw error;
    }
  }

  /**
   * Get market address from market name (e.g., "BTC-USD")
   */
  async getMarketAddress(marketName: string): Promise<string | null> {
    console.log(`[DecibelMarketService] Getting market address for: ${marketName}`);
    const markets = await this.getMarkets();
    console.log(`[DecibelMarketService] Total markets available: ${markets.length}`);
    console.log(`[DecibelMarketService] Market names:`, markets.map(m => m.market_name));
    const market = markets.find(m => m.market_name === marketName);
    console.log(`[DecibelMarketService] Found market for ${marketName}:`, market ? { name: market.market_name, address: market.market_addr } : 'NOT FOUND');
    return market?.market_addr || null;
  }

  /**
   * Get market prices (all markets or specific market)
   */
  async getMarketPrices(marketAddress?: string): Promise<DecibelPrice[]> {
    try {
      const url = '/api/v1/prices';
      const params = marketAddress ? { market: marketAddress } : {};
      const config = {
        params,
        headers: getDecibelHeaders(false),
      };
      const response = await decibelClient.get<DecibelPrice[]>(url, config);
      return response.data;
    } catch (error: any) {
      console.error('[DecibelMarketService] Error getting market prices:', error.message);
      throw error;
    }
  }

  /**
   * Get order book depth for a market
   */
  async getOrderBook(marketAddress: string, limit: number = 20): Promise<DecibelOrderBook> {
    try {
      const url = '/api/v1/depth';
      const params = { market: marketAddress, limit };
      console.log(`[DecibelMarketService] Fetching orderbook:`, {
        market: marketAddress,
        limit,
      });
      const config = {
        params,
        headers: getDecibelHeaders(false),
      };
      const response = await decibelClient.get<DecibelOrderBook>(url, config);
      console.log(`[DecibelMarketService] Orderbook response:`, {
        bids: response.data?.bids?.length || 0,
        asks: response.data?.asks?.length || 0,
        market: marketAddress,
      });
      return response.data;
    } catch (error: any) {
      console.error('[DecibelMarketService] Error getting order book:', {
        market: marketAddress,
        limit,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw error;
    }
  }

  /**
   * Get recent trades for a market
   */
  async getTrades(marketAddress: string, limit: number = 20): Promise<DecibelTrade[]> {
    try {
      const url = '/api/v1/trades';
      const params = { market: marketAddress, limit };
      console.log(`[DecibelMarketService] Fetching trades:`, {
        market: marketAddress,
        limit,
      });
      const config = {
        params,
        headers: getDecibelHeaders(false),
      };
      const response = await decibelClient.get<DecibelTrade[]>(url, config);
      console.log(`[DecibelMarketService] Trades response:`, {
        count: response.data?.length || 0,
        market: marketAddress,
      });
      return response.data;
    } catch (error: any) {
      console.error('[DecibelMarketService] Error getting trades:', {
        market: marketAddress,
        limit,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw error;
    }
  }

  /**
   * Get candlestick (OHLC) data for a market
   */
  async getCandlesticks(
    marketAddress: string,
    interval: '1m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d' | '1w',
    startTime: number,
    endTime: number
  ): Promise<DecibelCandlestick[]> {
    try {
      const url = '/api/v1/candlesticks';
      const params = { market: marketAddress, interval, startTime, endTime };
      console.log(`[DecibelMarketService] Fetching candlesticks:`, {
        market: marketAddress,
        interval,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      const config = {
        params,
        headers: getDecibelHeaders(false),
      };
      const response = await decibelClient.get<DecibelCandlestick[]>(url, config);
      console.log(`[DecibelMarketService] Candlesticks response:`, {
        count: response.data?.length || 0,
        interval,
        market: marketAddress,
      });
      return response.data;
    } catch (error: any) {
      console.error('[DecibelMarketService] Error getting candlesticks:', {
        market: marketAddress,
        interval,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw error;
    }
  }
}

