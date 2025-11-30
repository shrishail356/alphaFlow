import { decibelClient, getDecibelHeaders } from './decibel-client';
import type { DecibelPosition, DecibelOrder } from './decibel-types';

export class DecibelUserService {
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
        headers: getDecibelHeaders(true),
      };
      const response = await decibelClient.get<DecibelPosition[]>(url, config);
      return response.data;
    } catch (error: any) {
      console.error('[DecibelUserService] Error getting user positions:', error.message);
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
        headers: getDecibelHeaders(true),
      };
      const response = await decibelClient.get<DecibelOrder[]>(url, config);
      return response.data;
    } catch (error: any) {
      console.error('[DecibelUserService] Error getting user open orders:', error.message);
      if (error.response?.status === 401 || error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }
}

