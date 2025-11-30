import axios from 'axios';
import { env } from '../config/env';
import { decibelClient, getDecibelHeaders } from './decibel/decibel-client';

export interface Position {
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

export interface Trade {
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

export interface Order {
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

export class DecibelPortfolioService {
  /**
   * Get user positions
   */
  async getUserPositions(userAddress: string, options?: {
    limit?: number;
    includeDeleted?: boolean;
    marketAddress?: string;
  }): Promise<Position[]> {
    try {
      const params: any = { user: userAddress };
      if (options?.limit) params.limit = options.limit;
      if (options?.includeDeleted !== undefined) params.include_deleted = options.includeDeleted;
      if (options?.marketAddress) params.market_address = options.marketAddress;

      const response = await decibelClient.get('/api/v1/user_positions', {
        params,
        headers: getDecibelHeaders(true),
      });
      return response.data || [];
    } catch (error: any) {
      console.error('[DecibelPortfolio] Error fetching positions:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get user trade history
   */
  async getUserTradeHistory(userAddress: string, options?: {
    limit?: number;
    orderId?: string;
    marketAddress?: string;
  }): Promise<Trade[]> {
    try {
      const params: any = { user: userAddress };
      if (options?.limit) params.limit = options.limit;
      if (options?.orderId) params.order_id = options.orderId;
      if (options?.marketAddress) params.market = options.marketAddress;

      const response = await decibelClient.get('/api/v1/trade_history', {
        params,
        headers: getDecibelHeaders(true),
      });
      return response.data || [];
    } catch (error: any) {
      console.error('[DecibelPortfolio] Error fetching trade history:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get user's open orders
   */
  async getOpenOrders(userAddress: string, limit?: number): Promise<Order[]> {
    try {
      const params: any = { user: userAddress };
      if (limit) params.limit = limit;

      const response = await decibelClient.get('/api/v1/open_orders', {
        params,
        headers: getDecibelHeaders(true),
      });
      return response.data || [];
    } catch (error: any) {
      console.error('[DecibelPortfolio] Error fetching open orders:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get user order history (paginated)
   */
  async getOrderHistory(userAddress: string): Promise<{ items: Order[]; total_count: number }> {
    try {
      const params = { user: userAddress };
      const response = await decibelClient.get('/api/v1/order_history', {
        params,
        headers: getDecibelHeaders(true),
      });
      return response.data || { items: [], total_count: 0 };
    } catch (error: any) {
      console.error('[DecibelPortfolio] Error fetching order history:', error.response?.data || error.message);
      throw error;
    }
  }
}

export const decibelPortfolioService = new DecibelPortfolioService();

