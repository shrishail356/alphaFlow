import axios from 'axios';
import { env } from '../config/env';

// Create axios client
const decibelClient = axios.create({
  baseURL: env.DECIBEL_BASE_URL,
});

// Set Authorization header if API key is provided
if (env.DECIBEL_API_KEY) {
  decibelClient.defaults.headers.common['Authorization'] = `Bearer ${env.DECIBEL_API_KEY}`;
  console.log('[DecibelService] Authorization header set on axios client');
  console.log('[DecibelService] Authorization header value (first 20 chars):', `Bearer ${env.DECIBEL_API_KEY.substring(0, 20)}...`);
} else {
  console.warn('[DecibelService] WARNING: DECIBEL_API_KEY is not set in environment!');
}

// Log API key info (first 10 chars only for security)
if (env.DECIBEL_API_KEY) {
  console.log('[DecibelService] API Key configured (first 10 chars):', env.DECIBEL_API_KEY.substring(0, 10) + '...');
  console.log('[DecibelService] API Key length:', env.DECIBEL_API_KEY.length);
  console.log('[DecibelService] API Key last 10 chars:', '...' + env.DECIBEL_API_KEY.substring(env.DECIBEL_API_KEY.length - 10));
} else {
  console.warn('[DecibelService] WARNING: DECIBEL_API_KEY is not set!');
}

export interface DecibelSubaccount {
  subaccount_address: string;
  primary_account_address: string;
  is_primary: boolean;
  is_active: boolean;
  custom_label?: string | null;
}

export interface DecibelAccountOverview {
  perp_equity_balance: number;
  unrealized_pnl: number;
  unrealized_funding_cost: number;
  cross_margin_ratio: number;
  maintenance_margin: number;
  cross_account_leverage_ratio: number;
  total_margin: number;
  usdc_cross_withdrawable_balance: number;
  usdc_isolated_withdrawable_balance: number;
  volume?: number | null;
  all_time_return?: number | null;
  average_cash_position?: number | null;
  average_leverage?: number | null;
  cross_account_position?: number | null;
  max_drawdown?: number | null;
  pnl_90d?: number | null;
  sharpe_ratio?: number | null;
  weekly_win_rate_12w?: number | null;
}

export interface DecibelMarket {
  market_addr: string;
  market_name: string;
  max_leverage: number;
  max_open_interest: number;
  min_size: number;
  px_decimals: number;
  sz_decimals: number;
  tick_size: number;
  lot_size: number;
}

export interface DecibelPrice {
  market: string;
  oracle_px: number;
  mark_px: number;
  mid_px: number;
  funding_rate_bps: number;
  is_funding_positive: boolean;
  open_interest: number;
  transaction_unix_ms: number;
}

export interface DecibelOrderBookLevel {
  price: number;
  size: number;
}

export interface DecibelOrderBook {
  market: string;
  bids: DecibelOrderBookLevel[];
  asks: DecibelOrderBookLevel[];
}

export interface DecibelTrade {
  account: string;
  market: string;
  action: string;
  trade_id: number;
  size: number;
  price: number;
  is_profit: boolean;
  realized_pnl_amount: number;
  is_funding_positive: boolean;
  realized_funding_amount: number;
  is_rebate: boolean;
  fee_amount: number;
  order_id: string;
  client_order_id: string;
  transaction_unix_ms: number;
  transaction_version: number;
}

export interface DecibelCandlestick {
  t: number; // start time
  T: number; // end time
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
  i: string; // interval
}

export interface DecibelPosition {
  market: string;
  user: string;
  size: number;
  user_leverage: number;
  max_allowed_leverage: number;
  entry_price: number;
  is_isolated: boolean;
  is_deleted: boolean;
  unrealized_funding: number;
  event_uid: number;
  estimated_liquidation_price: number;
  transaction_version: number;
  has_fixed_sized_tpsls: boolean;
  sl_limit_price?: number | null;
  sl_order_id?: string | null;
  sl_trigger_price?: number | null;
  tp_limit_price?: number | null;
  tp_order_id?: string | null;
  tp_trigger_price?: number | null;
}

export interface DecibelOrder {
  parent: string;
  market: string;
  client_order_id: string;
  order_id: string;
  status: string;
  order_type: string;
  trigger_condition: string;
  order_direction: string;
  is_buy: boolean;
  is_reduce_only: boolean;
  details: string;
  transaction_version: number;
  unix_ms: number;
  orig_size?: number | null;
  price?: number | null;
  remaining_size?: number | null;
  size_delta?: number | null;
  sl_limit_price?: number | null;
  sl_order_id?: string | null;
  sl_trigger_price?: number | null;
  tp_limit_price?: number | null;
  tp_order_id?: string | null;
  tp_trigger_price?: number | null;
}

export class DecibelService {
  /**
   * Get all subaccounts for an owner address
   */
  async getSubaccounts(ownerAddress: string): Promise<DecibelSubaccount[]> {
    console.log('[DecibelService] Getting subaccounts for address:', ownerAddress);
    console.log('[DecibelService] API Key set:', !!env.DECIBEL_API_KEY);
    console.log('[DecibelService] Base URL:', env.DECIBEL_BASE_URL);
    
    try {
      const url = '/api/v1/subaccounts';
      const params = { owner: ownerAddress };
      console.log('[DecibelService] Request URL:', `${env.DECIBEL_BASE_URL}${url}`);
      console.log('[DecibelService] Request params:', params);
      
      // Log the headers being sent (mask the key)
      const headers = decibelClient.defaults.headers.common;
      const authHeader = headers.Authorization as string | undefined;
      console.log('[DecibelService] Request headers:', {
        ...Object.fromEntries(
          Object.entries(headers).filter(([key]) => key !== 'Authorization')
        ),
        Authorization: authHeader ? 
          `Bearer ${authHeader.substring(7, 17)}...${authHeader.substring(authHeader.length - 4)}` : 
          'Not set'
      });
      
      // Make request with explicit Authorization and Origin headers
      // Decibel API requires Origin header for authenticated requests
      const config = {
        params,
        headers: {
          ...(env.DECIBEL_API_KEY && { Authorization: `Bearer ${env.DECIBEL_API_KEY}` }),
          Origin: 'https://app.decibel.trade', // Required by Decibel API
        }
      };
      
      console.log('[DecibelService] Request config headers:', Object.keys(config.headers));
      
      const response = await decibelClient.get<DecibelSubaccount[]>(url, config);
      
      console.log('[DecibelService] Subaccounts response status:', response.status);
      console.log('[DecibelService] Subaccounts response data:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('[DecibelService] Error getting subaccounts:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
      
      // 401 = no auth/not set up, 404/400 = no subaccounts found
      if (error.response?.status === 401 || error.response?.status === 404 || error.response?.status === 400) {
        console.log('[DecibelService] Treating as no subaccounts found (status:', error.response?.status, ')');
        return [];
      }
      throw error;
    }
  }

  /**
   * Get account overview for a user address
   */
  async getAccountOverview(userAddress: string): Promise<DecibelAccountOverview | null> {
    console.log('[DecibelService] Getting account overview for address:', userAddress);
    
    try {
      const url = '/api/v1/account_overviews';
      const params = { user: userAddress };
      console.log('[DecibelService] Request URL:', `${env.DECIBEL_BASE_URL}${url}`);
      console.log('[DecibelService] Request params:', params);
      
      // Log the headers being sent (mask the key)
      const headers = decibelClient.defaults.headers.common;
      const authHeader = headers.Authorization as string | undefined;
      console.log('[DecibelService] Request headers:', {
        ...Object.fromEntries(
          Object.entries(headers).filter(([key]) => key !== 'Authorization')
        ),
        Authorization: authHeader ? 
          `Bearer ${authHeader.substring(7, 17)}...${authHeader.substring(authHeader.length - 4)}` : 
          'Not set'
      });
      
      // Make request with explicit Authorization and Origin headers
      // Decibel API requires Origin header for authenticated requests
      const config = {
        params,
        headers: {
          ...(env.DECIBEL_API_KEY && { Authorization: `Bearer ${env.DECIBEL_API_KEY}` }),
          Origin: 'https://app.decibel.trade', // Required by Decibel API
        }
      };
      
      console.log('[DecibelService] Request config headers:', Object.keys(config.headers));
      
      const response = await decibelClient.get<DecibelAccountOverview>(url, config);
      
      console.log('[DecibelService] Account overview response status:', response.status);
      console.log('[DecibelService] Account overview response data:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('[DecibelService] Error getting account overview:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
      
      // 401 = no auth/not set up, 404/400 = no account found
      if (error.response?.status === 401 || error.response?.status === 404 || error.response?.status === 400) {
        console.log('[DecibelService] Treating as no account found (status:', error.response?.status, ')');
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if user has Decibel account with balance
   */
  async checkAccountStatus(walletAddress: string): Promise<{
    hasAccount: boolean;
    hasBalance: boolean;
    balance: number;
    subaccounts: DecibelSubaccount[];
  }> {
    console.log('[DecibelService] Checking account status for:', walletAddress);
    
    const subaccounts = await this.getSubaccounts(walletAddress);
    console.log('[DecibelService] Subaccounts found:', subaccounts.length);
    
    const overview = await this.getAccountOverview(walletAddress);
    console.log('[DecibelService] Account overview:', overview ? 'Found' : 'Not found');

    const hasAccount = subaccounts.length > 0;
    const balance = overview?.usdc_cross_withdrawable_balance ?? 0;
    const hasBalance = balance > 0;

    const result = {
      hasAccount,
      hasBalance,
      balance,
      subaccounts,
    };
    
    console.log('[DecibelService] Final status result:', JSON.stringify(result, null, 2));

    return result;
  }

  /**
   * Get all available markets
   */
  async getMarkets(): Promise<DecibelMarket[]> {
    try {
      const url = '/api/v1/markets';
      const config = {
        headers: {
          Origin: 'https://app.decibel.trade',
        }
      };
      const response = await decibelClient.get<DecibelMarket[]>(url, config);
      return response.data;
    } catch (error: any) {
      console.error('[DecibelService] Error getting markets:', error.message);
      throw error;
    }
  }

  /**
   * Get market address from market name (e.g., "BTC-USD")
   */
  async getMarketAddress(marketName: string): Promise<string | null> {
    const markets = await this.getMarkets();
    const market = markets.find(m => m.market_name === marketName);
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
        headers: {
          Origin: 'https://app.decibel.trade',
        }
      };
      const response = await decibelClient.get<DecibelPrice[]>(url, config);
      return response.data;
    } catch (error: any) {
      console.error('[DecibelService] Error getting market prices:', error.message);
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
      const config = {
        params,
        headers: {
          Origin: 'https://app.decibel.trade',
        }
      };
      const response = await decibelClient.get<DecibelOrderBook>(url, config);
      return response.data;
    } catch (error: any) {
      console.error('[DecibelService] Error getting order book:', error.message);
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
      const config = {
        params,
        headers: {
          Origin: 'https://app.decibel.trade',
        }
      };
      const response = await decibelClient.get<DecibelTrade[]>(url, config);
      return response.data;
    } catch (error: any) {
      console.error('[DecibelService] Error getting trades:', error.message);
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
      const config = {
        params,
        headers: {
          Origin: 'https://app.decibel.trade',
        }
      };
      const response = await decibelClient.get<DecibelCandlestick[]>(url, config);
      return response.data;
    } catch (error: any) {
      console.error('[DecibelService] Error getting candlesticks:', error.message);
      throw error;
    }
  }

  /**
   * Get user positions
   */
  async getUserPositions(userAddress: string, marketAddress?: string): Promise<DecibelPosition[]> {
    try {
      const url = '/api/v1/user_positions';
      const params: any = { user: userAddress };
      if (marketAddress) params.market_address = marketAddress;
      
      const config = {
        params,
        headers: {
          ...(env.DECIBEL_API_KEY && { Authorization: `Bearer ${env.DECIBEL_API_KEY}` }),
          Origin: 'https://app.decibel.trade',
        }
      };
      const response = await decibelClient.get<DecibelPosition[]>(url, config);
      return response.data;
    } catch (error: any) {
      console.error('[DecibelService] Error getting user positions:', error.message);
      if (error.response?.status === 401 || error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get user's open orders
   */
  async getUserOpenOrders(userAddress: string, limit: number = 50): Promise<DecibelOrder[]> {
    try {
      const url = '/api/v1/open_orders';
      const params = { user: userAddress, limit };
      const config = {
        params,
        headers: {
          ...(env.DECIBEL_API_KEY && { Authorization: `Bearer ${env.DECIBEL_API_KEY}` }),
          Origin: 'https://app.decibel.trade',
        }
      };
      const response = await decibelClient.get<DecibelOrder[]>(url, config);
      return response.data;
    } catch (error: any) {
      console.error('[DecibelService] Error getting user open orders:', error.message);
      if (error.response?.status === 401 || error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }
}

export const decibelService = new DecibelService();

