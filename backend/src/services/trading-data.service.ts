import { decibelService } from './decibel/decibel.service';
import { DecibelAccountOverview, DecibelPosition, DecibelOrder } from './decibel/decibel-types';

export interface TradingDataContext {
  walletAddress: string;
  accountOverview?: DecibelAccountOverview;
  positions: DecibelPosition[];
  openOrders: DecibelOrder[];
  marketData: {
    markets: any[];
    prices: any[];
    orderbook: any;
    trades: any[];
    candlesticks: {
      '15m'?: any[];
      '1h'?: any[];
      '4h'?: any[];
      '1d'?: any[];
      '1w'?: any[];
    };
    allMarketsData?: Record<string, any>;
  };
}

export class TradingDataService {
  /**
   * Fetch comprehensive trading data with large duration candlesticks
   */
  async getTradingData(
    walletAddress: string,
    marketName?: string
  ): Promise<TradingDataContext> {
    // Fetch account data
    const [accountOverview, positions, openOrders] = await Promise.all([
      decibelService.getAccountOverview(walletAddress).catch(() => null),
      decibelService.getUserPositions(walletAddress).catch(() => []),
      decibelService.getUserOpenOrders(walletAddress).catch(() => []),
    ]);

    // Fetch market data
    const [markets, prices] = await Promise.all([
      decibelService.getMarkets().catch(() => []),
      decibelService.getMarketPrices().catch(() => []),
    ]);

    // Determine markets to fetch (using forward slash format as per Decibel API)
    const majorMarkets = ['BTC/USD', 'APT/USD', 'ETH/USD'];
    const marketsToFetch = marketName
      ? [marketName, ...majorMarkets.filter(m => m !== marketName)]
      : majorMarkets;

    console.log('[TradingData] Markets to fetch:', marketsToFetch);

    const endTime = Date.now();
    // Large duration timeframes
    const startTime30d = endTime - 30 * 24 * 60 * 60 * 1000; // 30 days
    const startTime7d = endTime - 7 * 24 * 60 * 60 * 1000; // 7 days
    const startTime3d = endTime - 3 * 24 * 60 * 60 * 1000; // 3 days
    const startTime24h = endTime - 24 * 60 * 60 * 1000; // 24 hours
    const startTime12h = endTime - 12 * 60 * 60 * 1000; // 12 hours

    console.log('[TradingData] Time ranges:', {
      startTime12h: new Date(startTime12h).toISOString(),
      startTime3d: new Date(startTime3d).toISOString(),
      startTime7d: new Date(startTime7d).toISOString(),
      startTime30d: new Date(startTime30d).toISOString(),
      endTime: new Date(endTime).toISOString(),
    });

    // Fetch comprehensive market data for all relevant markets
    const marketDataPromises = marketsToFetch.map(async (mktName) => {
      console.log(`[TradingData] Fetching market address for: ${mktName}`);
      let mktAddress: string | null = null;
      try {
        mktAddress = await decibelService.getMarketAddress(mktName);
        console.log(`[TradingData] Market address for ${mktName}:`, mktAddress);
      } catch (error: any) {
        console.error(`[TradingData] Error getting market address for ${mktName}:`, error.message);
        return null;
      }
      
      if (!mktAddress) {
        console.warn(`[TradingData] No market address found for ${mktName}, skipping...`);
        return null;
      }

      try {
        console.log(`[TradingData] Fetching data for ${mktName} (${mktAddress})...`);
        
        // Fetch multiple timeframes with large duration
        const [
          candlesticks15m,
          candlesticks1h,
          candlesticks4h,
          candlesticks1d,
          candlesticks1w,
          orderbook,
          trades,
        ] = await Promise.all([
          // 15m: Last 12 hours (48 candles)
          decibelService.getCandlesticks(mktAddress, '15m', startTime12h, endTime).catch((err) => {
            console.error(`[TradingData] Error fetching 15m candlesticks for ${mktName}:`, err.message);
            return [];
          }),
          // 1h: Last 3 days (72 candles)
          decibelService.getCandlesticks(mktAddress, '1h', startTime3d, endTime).catch((err) => {
            console.error(`[TradingData] Error fetching 1h candlesticks for ${mktName}:`, err.message);
            return [];
          }),
          // 4h: Last 7 days (42 candles)
          decibelService.getCandlesticks(mktAddress, '4h', startTime7d, endTime).catch((err) => {
            console.error(`[TradingData] Error fetching 4h candlesticks for ${mktName}:`, err.message);
            return [];
          }),
          // 1d: Last 30 days (30 candles)
          decibelService.getCandlesticks(mktAddress, '1d', startTime30d, endTime).catch((err) => {
            console.error(`[TradingData] Error fetching 1d candlesticks for ${mktName}:`, err.message);
            return [];
          }),
          // 1w: Last 30 days (4-5 candles)
          decibelService.getCandlesticks(mktAddress, '1w', startTime30d, endTime).catch((err) => {
            console.error(`[TradingData] Error fetching 1w candlesticks for ${mktName}:`, err.message);
            return [];
          }),
          // Order book: Top 50 levels for better depth
          decibelService.getOrderBook(mktAddress, 50).catch((err) => {
            console.error(`[TradingData] Error fetching orderbook for ${mktName}:`, err.message);
            return null;
          }),
          // Recent trades: Last 100 trades
          decibelService.getTrades(mktAddress, 100).catch((err) => {
            console.error(`[TradingData] Error fetching trades for ${mktName}:`, err.message);
            return [];
          }),
        ]);

        console.log(`[TradingData] Data fetched for ${mktName}:`, {
          candlesticks15m: candlesticks15m?.length || 0,
          candlesticks1h: candlesticks1h?.length || 0,
          candlesticks4h: candlesticks4h?.length || 0,
          candlesticks1d: candlesticks1d?.length || 0,
          candlesticks1w: candlesticks1w?.length || 0,
          orderbookBids: orderbook?.bids?.length || 0,
          orderbookAsks: orderbook?.asks?.length || 0,
          trades: trades?.length || 0,
        });

        return {
          marketName: mktName,
          marketAddress: mktAddress,
          candlesticks: {
            '15m': candlesticks15m,
            '1h': candlesticks1h,
            '4h': candlesticks4h,
            '1d': candlesticks1d,
            '1w': candlesticks1w,
          },
          orderbook,
          trades,
        };
      } catch (error) {
        console.error(`[TradingData] Error fetching data for ${mktName}:`, error);
        return null;
      }
    });

    const marketDataResults = await Promise.all(marketDataPromises);
    console.log('[TradingData] Market data results:', {
      totalResults: marketDataResults.length,
      nonNullResults: marketDataResults.filter(d => d !== null).length,
      results: marketDataResults.map(r => r ? { market: r.marketName, hasData: true } : { market: 'null', hasData: false }),
    });

    const marketDataMap = new Map(
      marketDataResults
        .filter((data): data is NonNullable<typeof data> => data !== null)
        .map(data => [data.marketName, data])
    );

    console.log('[TradingData] Market data map:', {
      mapSize: marketDataMap.size,
      markets: Array.from(marketDataMap.keys()),
    });

    // Get primary market data
    const primaryMarketName = marketName || majorMarkets[0];
    const primaryMarketData = marketDataMap.get(primaryMarketName) || marketDataResults.find(d => d !== null);

    console.log('[TradingData] Primary market:', {
      requestedMarket: marketName,
      primaryMarketName,
      foundData: !!primaryMarketData,
      marketAddress: primaryMarketData?.marketAddress,
    });

    const orderbook = primaryMarketData?.orderbook || null;
    const trades = primaryMarketData?.trades || [];
    const candlesticks = primaryMarketData?.candlesticks || {
      '15m': [],
      '1h': [],
      '4h': [],
      '1d': [],
      '1w': [],
    };

    console.log('[TradingData] Final data summary:', {
      hasOrderbook: !!orderbook,
      orderbookBids: orderbook?.bids?.length || 0,
      orderbookAsks: orderbook?.asks?.length || 0,
      tradesCount: trades.length,
      candlesticks: {
        '15m': candlesticks['15m']?.length || 0,
        '1h': candlesticks['1h']?.length || 0,
        '4h': candlesticks['4h']?.length || 0,
        '1d': candlesticks['1d']?.length || 0,
        '1w': candlesticks['1w']?.length || 0,
      },
    });

    return {
      walletAddress,
      accountOverview: accountOverview || undefined,
      positions: positions || [],
      openOrders: openOrders || [],
      marketData: {
        markets: markets || [],
        prices: prices || [],
        orderbook,
        trades,
        candlesticks,
        allMarketsData: Object.fromEntries(marketDataMap),
      },
    };
  }
}

export const tradingDataService = new TradingDataService();

