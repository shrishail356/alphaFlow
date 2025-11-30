// Main Decibel service that exports all sub-services
import { DecibelAccountService } from './decibel-account.service';
import { DecibelMarketService } from './decibel-market.service';
import { DecibelUserService } from './decibel-user.service';

// Export all types
export * from './decibel-types';

// Create service instances
export const decibelAccountService = new DecibelAccountService();
export const decibelMarketService = new DecibelMarketService();
export const decibelUserService = new DecibelUserService();

// Main service class that provides convenient access to all services
export class DecibelService {
  account = decibelAccountService;
  market = decibelMarketService;
  user = decibelUserService;

  // Convenience methods for backward compatibility
  async getSubaccounts(ownerAddress: string) {
    return this.account.getSubaccounts(ownerAddress);
  }

  async getAccountOverview(userAddress: string) {
    return this.account.getAccountOverview(userAddress);
  }

  async checkAccountStatus(walletAddress: string) {
    return this.account.checkAccountStatus(walletAddress);
  }

  async getMarkets() {
    return this.market.getMarkets();
  }

  async getMarketAddress(marketName: string) {
    return this.market.getMarketAddress(marketName);
  }

  async getMarketPrices(marketAddress?: string) {
    return this.market.getMarketPrices(marketAddress);
  }

  async getOrderBook(marketAddress: string, limit?: number) {
    return this.market.getOrderBook(marketAddress, limit);
  }

  async getTrades(marketAddress: string, limit?: number) {
    return this.market.getTrades(marketAddress, limit);
  }

  async getCandlesticks(
    marketAddress: string,
    interval: '1m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d' | '1w',
    startTime: number,
    endTime: number
  ) {
    return this.market.getCandlesticks(marketAddress, interval, startTime, endTime);
  }

  async getUserPositions(userAddress: string, marketAddress?: string) {
    return this.user.getUserPositions(userAddress, marketAddress);
  }

  async getUserOpenOrders(userAddress: string, limit?: number) {
    return this.user.getUserOpenOrders(userAddress, limit);
  }
}

// Export singleton instance
export const decibelService = new DecibelService();

