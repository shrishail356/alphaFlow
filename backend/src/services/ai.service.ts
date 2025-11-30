import axios from 'axios';
import { env } from '../config/env';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-3.5-sonnet';

export interface AIResponse {
  action: 'query_balance' | 'analyze_market' | 'suggest_trade' | 'place_order' | 'chat';
  message: string;
  data?: any;
  tradeSuggestion?: TradeSuggestion;
  tradeSuggestions?: TradeSuggestion[]; // For multiple trade suggestions
}

export interface TradeSuggestion {
  market: string;
  side: 'buy' | 'sell';
  size: number;
  orderType: 'market' | 'limit';
  price?: number;
  slPrice?: number;
  tpPrice?: number;
  leverage?: number;
  reasoning: string;
  risk: 'low' | 'medium' | 'high';
  confidence: number;
  preferred?: boolean; // Mark the most recommended trade
}

export class AIService {
  private async callOpenRouter(messages: any[]): Promise<string> {
    if (!env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set in environment');
    }

    try {
      const response = await axios.post(
        OPENROUTER_API_URL,
        {
          model: MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 2000,
        },
        {
          headers: {
            'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': env.FRONTEND_ORIGIN,
            'X-Title': 'AlphaFlow AI Trading Assistant',
          },
        }
      );

      return response.data.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('[AIService] OpenRouter API error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  private buildSystemPrompt(context: {
    accountOverview?: any;
    primarySubaccountOverview?: any;
    positions?: any[];
    openOrders?: any[];
    marketData?: {
      markets?: any[];
      prices?: any[];
      orderbook?: any;
      trades?: any[];
      candlesticks?: any; // Can be array or object with timeframes
      allMarketsData?: any;
    };
    marketSentiment?: {
      overallSentiment?: string;
      value?: number;
      classification?: string;
      marketAnalysis?: any;
    };
  }): string {
    return `You are an expert AI Trading Assistant for Decibel, a decentralized perpetual futures exchange on Aptos blockchain.

Your role is to:
1. Analyze market conditions and provide insights
2. Answer questions about user's account, positions, and orders
3. Suggest trades based on market analysis and user's risk profile
4. Provide clear, actionable trading advice

CRITICAL: You MUST respond in STRICT JSON format only. No markdown, no code blocks, just pure JSON.

Response Format (ALWAYS use this exact structure):
{
  "action": "query_balance" | "analyze_market" | "suggest_trade" | "place_order" | "chat",
  "message": "Human-readable response message",
  "data": { /* optional additional data */ },
  "tradeSuggestion": { /* use for SINGLE trade suggestion */
    "market": "BTC/USD" | "APT/USD" | "ETH/USD" | etc (use forward slash format),
    "side": "buy" | "sell",
    "size": 0.5,
    "orderType": "market" | "limit",
    "price": 45000, /* required if orderType is "limit" */
    "slPrice": 44000, /* optional stop loss */
    "tpPrice": 46000, /* optional take profit */
    "leverage": 5, /* optional, 1-50 */
    "reasoning": "Detailed explanation of why this trade is suggested",
    "risk": "low" | "medium" | "high",
    "confidence": 0.85 /* 0-1 scale */
  }
  OR (if user asks for MULTIPLE trades like "give 2-3 trades"):
  "tradeSuggestions": [ /* array of trade suggestions */
    {
      "market": "BTC/USD",
      "side": "buy",
      "size": 0.1,
      "orderType": "limit",
      "price": 90500,
      "slPrice": 89800,
      "tpPrice": 92000,
      "leverage": 10,
      "reasoning": "Detailed explanation",
      "risk": "medium",
      "confidence": 0.75,
      "preferred": true /* Mark the most recommended trade */
    },
    {
      "market": "BTC/USD",
      "side": "sell",
      "size": 0.05,
      "orderType": "limit",
      "price": 91200,
      "slPrice": 91900,
      "tpPrice": 89800,
      "leverage": 5,
      "reasoning": "Detailed explanation",
      "risk": "high",
      "confidence": 0.65,
      "preferred": false
    }
  ]
}

Market Sentiment (Current):
${context.marketSentiment ? `
- Overall Sentiment: ${context.marketSentiment.overallSentiment || 'N/A'} (Value: ${context.marketSentiment.value || 'N/A'}/100)
- Classification: ${context.marketSentiment.classification || 'N/A'}
${context.marketSentiment.marketAnalysis ? `
- BTC: ${context.marketSentiment.marketAnalysis.btc?.sentiment || 'N/A'} (Price: $${context.marketSentiment.marketAnalysis.btc?.price?.toLocaleString() || 'N/A'}, 24h: ${context.marketSentiment.marketAnalysis.btc?.change24h?.toFixed(2) || 'N/A'}%)
- ETH: ${context.marketSentiment.marketAnalysis.eth?.sentiment || 'N/A'} (Price: $${context.marketSentiment.marketAnalysis.eth?.price?.toLocaleString() || 'N/A'}, 24h: ${context.marketSentiment.marketAnalysis.eth?.change24h?.toFixed(2) || 'N/A'}%)
` : ''}
` : 'No sentiment data available'}

Available Markets:
${context.marketData?.markets?.map(m => `- ${m.market_name} (${m.market_addr}): Max leverage ${m.max_leverage}x, Min size ${m.min_size}, Tick size ${m.tick_size}`).join('\n') || 'No market data available'}

Current Market Prices:
${context.marketData?.prices?.map(p => {
  const marketName = context.marketData?.markets?.find(m => m.market_addr === p.market)?.market_name || p.market;
  return `- ${marketName}: Oracle $${p.oracle_px}, Mark $${p.mark_px}, Mid $${p.mid_px}, Funding ${(p.funding_rate_bps / 100).toFixed(4)}%, OI $${p.open_interest.toLocaleString()}`;
}).join('\n') || 'No price data available'}

User Account Status:
${context.accountOverview ? `
- Equity: $${(context.accountOverview.perp_equity_balance || 0).toFixed(2)}
- Unrealized P&L: $${(context.accountOverview.unrealized_pnl || 0).toFixed(2)}
- Available Balance: $${(context.accountOverview.usdc_cross_withdrawable_balance || 0).toFixed(2)}
- Total Margin: $${(context.accountOverview.total_margin || 0).toFixed(2)}
- Leverage Ratio: ${context.accountOverview.cross_account_leverage_ratio ? context.accountOverview.cross_account_leverage_ratio.toFixed(2) + 'x' : 'N/A'}
- Maintenance Margin: $${(context.accountOverview.maintenance_margin || 0).toFixed(2)}
${context.primarySubaccountOverview ? `
Primary Subaccount Balance:
- Primary Subaccount Equity: $${(context.primarySubaccountOverview.perp_equity_balance || 0).toFixed(2)}
- Primary Subaccount Available Balance: $${(context.primarySubaccountOverview.usdc_cross_withdrawable_balance || 0).toFixed(2)}
- Primary Subaccount Total Margin: $${(context.primarySubaccountOverview.total_margin || 0).toFixed(2)}
NOTE: The Available Balance shown above ($${(context.accountOverview.usdc_cross_withdrawable_balance || 0).toFixed(2)}) is the TOTAL balance including both main wallet and primary subaccount. The primary subaccount balance is $${(context.primarySubaccountOverview.usdc_cross_withdrawable_balance || 0).toFixed(2)}.
` : ''}
` : 'No account data available'}

User Positions:
${context.positions && context.positions.length > 0 ? context.positions.map((pos, i) => {
  const marketName = context.marketData?.markets?.find(m => m.market_addr === pos.market)?.market_name || pos.market;
  return `${i + 1}. ${marketName}: Size ${pos.size}, Entry $${pos.entry_price}, Leverage ${pos.user_leverage}x, Liq Price $${pos.estimated_liquidation_price}`;
}).join('\n') : 'No open positions'}

User Open Orders:
${context.openOrders && context.openOrders.length > 0 ? context.openOrders.map((order, i) => {
  const marketName = context.marketData?.markets?.find(m => m.market_addr === order.market)?.market_name || order.market;
  return `${i + 1}. ${marketName}: ${order.is_buy ? 'BUY' : 'SELL'} ${order.remaining_size || order.orig_size} @ $${order.price || 'Market'}, Status: ${order.status}`;
}).join('\n') : 'No open orders'}

Chart Data (Candlestick/OHLC):
${(() => {
  const candlesticks = context.marketData?.candlesticks;
  if (!candlesticks) return 'No chart data available';
  
  // Handle both array format (legacy) and object format (multi-timeframe)
  if (Array.isArray(candlesticks)) {
    if (candlesticks.length === 0) return 'No chart data available';
    const recent = candlesticks.slice(-10); // Last 10 candles
    return `Recent 1h Candles (last 10):\n${recent.map((c: any, i: number) => 
      `${i + 1}. Time: ${new Date(c.t).toISOString()}, O: $${c.o}, H: $${c.h}, L: $${c.l}, C: $${c.c}, Volume: ${c.v}`
    ).join('\n')}`;
  } else if (typeof candlesticks === 'object') {
    // Multi-timeframe format - show more candles for better analysis
    let output = '';
    const timeframes = ['15m', '1h', '4h', '1d', '1w'] as const;
    const candleLimits: Record<string, number> = {
      '15m': 48,  // Last 48 candles (12 hours)
      '1h': 72,   // Last 72 candles (3 days)
      '4h': 42,   // Last 42 candles (7 days)
      '1d': 30,   // Last 30 candles (30 days)
      '1w': 10,   // Last 10 candles (10 weeks)
    };
    
    timeframes.forEach(tf => {
      const candles = candlesticks[tf];
      if (candles && Array.isArray(candles) && candles.length > 0) {
        const limit = candleLimits[tf] || 20;
        const recent = candles.slice(-limit); // Last N candles based on timeframe
        output += `\n${tf.toUpperCase()} Timeframe (last ${recent.length} candles, ${limit} max):\n`;
        
        // Show first 5, ... (if more than 10), last 5
        if (recent.length > 10) {
          const first5 = recent.slice(0, 5);
          const last5 = recent.slice(-5);
          output += first5.map((c: any, i: number) => 
            `  ${i + 1}. ${new Date(c.t).toISOString()}: O=$${c.o.toFixed(2)}, H=$${c.h.toFixed(2)}, L=$${c.l.toFixed(2)}, C=$${c.c.toFixed(2)}, Vol=${c.v.toFixed(2)}`
          ).join('\n');
          output += `\n  ... (${recent.length - 10} more candles) ...\n`;
          output += last5.map((c: any, i: number) => 
            `  ${recent.length - 4 + i}. ${new Date(c.t).toISOString()}: O=$${c.o.toFixed(2)}, H=$${c.h.toFixed(2)}, L=$${c.l.toFixed(2)}, C=$${c.c.toFixed(2)}, Vol=${c.v.toFixed(2)}`
          ).join('\n');
        } else {
          output += recent.map((c: any, i: number) => 
            `  ${i + 1}. ${new Date(c.t).toISOString()}: O=$${c.o.toFixed(2)}, H=$${c.h.toFixed(2)}, L=$${c.l.toFixed(2)}, C=$${c.c.toFixed(2)}, Vol=${c.v.toFixed(2)}`
          ).join('\n');
        }
        
        // Calculate key metrics for ALL candles in this timeframe
        const prices = recent.map((c: any) => c.c);
        const highs = recent.map((c: any) => c.h);
        const lows = recent.map((c: any) => c.l);
        const volumes = recent.map((c: any) => c.v);
        const currentPrice = prices[prices.length - 1];
        const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
        const highest = Math.max(...highs);
        const lowest = Math.min(...lows);
        const avgVolume = volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length;
        const priceChange = ((currentPrice - prices[0]) / prices[0]) * 100;
        const volatility = Math.sqrt(
          prices.reduce((sum: number, price: number) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length
        );
        
        output += `\n  Summary: Current=$${currentPrice.toFixed(2)}, Avg=$${avgPrice.toFixed(2)}, High=$${highest.toFixed(2)}, Low=$${lowest.toFixed(2)}, Change=${priceChange.toFixed(2)}%, Volatility=$${volatility.toFixed(2)}, Avg Vol=${avgVolume.toFixed(2)}`;
      }
    });
    return output || 'No chart data available';
  }
  return 'No chart data available';
})()}

Order Book Depth:
${context.marketData?.orderbook ? `
Bids (Top 20):
${context.marketData.orderbook.bids?.slice(0, 20).map((bid: any, i: number) => 
  `  ${i + 1}. $${bid.price.toFixed(2)} (Size: ${bid.size})`
).join('\n') || 'No bids'}

Asks (Top 20):
${context.marketData.orderbook.asks?.slice(0, 20).map((ask: any, i: number) => 
  `  ${i + 1}. $${ask.price.toFixed(2)} (Size: ${ask.size})`
).join('\n') || 'No asks'}

Spread: ${context.marketData.orderbook.asks?.[0]?.price && context.marketData.orderbook.bids?.[0]?.price 
  ? `$${(context.marketData.orderbook.asks[0].price - context.marketData.orderbook.bids[0].price).toFixed(2)}`
  : 'N/A'}
` : 'No order book data available'}

Recent Trades (Last 50):
${context.marketData?.trades && context.marketData.trades.length > 0 ? context.marketData.trades.slice(0, 50).map((trade: any, i: number) => 
  `${i + 1}. ${trade.action.toUpperCase()} ${trade.size} @ $${trade.price.toFixed(2)} (${new Date(trade.transaction_unix_ms).toISOString()})`
).join('\n') : 'No recent trades'}

Market Analysis Guidelines:
1. Analyze price trends, volume, and funding rates
2. Consider order book depth and recent trades
3. Assess market sentiment (bullish/bearish/neutral)
4. Identify support/resistance levels from candlestick data
5. Evaluate risk/reward ratios

Trade Suggestion Guidelines:
1. Always consider user's current balance and margin requirements
2. Suggest appropriate position sizes (don't over-leverage)
3. Recommend stop losses for risk management
4. Provide clear reasoning based on technical and fundamental analysis
5. Indicate confidence level (0-1) and risk level (low/medium/high)
6. Use market orders for immediate execution, limit orders for better prices
7. When providing multiple trade suggestions, mark ONE as "preferred": true - this should be the trade with the best risk-reward ratio, highest confidence, or best alignment with current market trend
8. The preferred trade should be clearly indicated in the reasoning as the "primary recommendation" or "best opportunity"

Risk Management:
- Never suggest trades that would exceed user's available balance
- Always recommend stop losses for leveraged positions
- Consider current leverage ratio when suggesting new positions
- Warn about high-risk trades

Remember:
- Respond ONLY in valid JSON format
- Be concise but informative
- Provide actionable insights
- Always include reasoning for trade suggestions
- Consider user's current positions when suggesting new trades`;
  }

  async processQuery(
    userMessage: string,
    context: {
      walletAddress: string;
      accountOverview?: any;
      positions?: any[];
      openOrders?: any[];
      marketData?: {
        markets?: any[];
        prices?: any[];
        orderbook?: any;
        trades?: any[];
        candlesticks?: any; // Can be array or object with timeframes
        allMarketsData?: any;
      };
      marketSentiment?: {
        overallSentiment?: string;
        value?: number;
        classification?: string;
        marketAnalysis?: any;
      };
    }
  ): Promise<AIResponse> {
    console.log('[AIService] Processing query:', userMessage.substring(0, 100));
    
    const systemPrompt = this.buildSystemPrompt({
      accountOverview: context.accountOverview,
      primarySubaccountOverview: (context as any).primarySubaccountOverview,
      positions: context.positions,
      openOrders: context.openOrders,
      marketData: context.marketData,
      marketSentiment: context.marketSentiment,
    });

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await this.callOpenRouter(messages);
      console.log('[AIService] Raw AI response:', response.substring(0, 200));

      // Parse JSON response (remove markdown code blocks if present)
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(jsonStr) as AIResponse;
      
      // Validate response structure
      if (!parsed.action || !parsed.message) {
        throw new Error('Invalid AI response format');
      }

      console.log('[AIService] Parsed AI response:', JSON.stringify(parsed, null, 2));
      return parsed;
    } catch (error: any) {
      console.error('[AIService] Error processing query:', error);
      
      // Return fallback response
      return {
        action: 'chat',
        message: 'I apologize, but I encountered an error processing your request. Please try again.',
        data: { error: error.message },
      };
    }
  }
}

export const aiService = new AIService();

