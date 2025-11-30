import express from 'express';
import { aiService } from '../services/ai.service';
import { marketSentimentService } from '../services/market-sentiment.service';
import { tradingDataService } from '../services/trading-data.service';
import { chatService } from '../services/chat.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { pool } from '../clients/db';
import { decibelService } from '../services/decibel/decibel.service';

const router = express.Router();

/**
 * POST /api/ai/chat
 * Multi-step AI chat with progress tracking
 * Step 1: Market Sentiment
 * Step 2: Trading Data (large duration)
 * Step 3: Final AI Analysis
 */
router.post('/chat', authMiddleware, async (req: AuthRequest, res) => {
  const startTime = Date.now();
  const progress: string[] = [];

  try {
    const { message, marketName } = req.body;
    const walletAddress = req.user?.wallet_address;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address not found' });
    }

    console.log('[AI Route] Processing multi-step chat query:', {
      message: message.substring(0, 100),
      walletAddress,
      marketName,
    });

    // Get user ID
    const userResult = await pool.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    const userId = userResult.rows[0]?.id;

    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Save user message
    await chatService.saveMessage(userId, 'user', message, {
      marketDataSnapshot: {
        timestamp: Date.now(),
      },
    });

    // Detect if this is a balance query
    const isBalanceQuery = /balance|funds|money|usdc|equity|available|how much/i.test(message);
    
    let marketSentiment: any = null;
    let tradingData: any = null;

    if (isBalanceQuery) {
      // For balance queries, skip market sentiment and trading data
      console.log('[AI Route] Detected balance query - skipping market data fetching');
      progress.push('💰 Fetching account balance...');
      
      // Get both main wallet and primary subaccount balances
      const [mainWalletOverview, subaccounts] = await Promise.all([
        decibelService.getAccountOverview(walletAddress).catch(() => null),
        decibelService.getSubaccounts(walletAddress).catch(() => []),
      ]);

      const primarySubaccount = subaccounts.find((sub: any) => sub.is_primary);
      let primarySubaccountOverview = null;
      
      if (primarySubaccount) {
        console.log('[AI Route] Fetching primary subaccount overview:', primarySubaccount.subaccount_address);
        primarySubaccountOverview = await decibelService.getAccountOverview(primarySubaccount.subaccount_address).catch(() => null);
      }

      // Calculate total balance (main wallet + primary subaccount)
      const mainBalance = mainWalletOverview?.usdc_cross_withdrawable_balance ?? 0;
      const primarySubaccountBalance = primarySubaccountOverview?.usdc_cross_withdrawable_balance ?? 0;
      const totalBalance = mainBalance + primarySubaccountBalance;

      console.log('[AI Route] Balance summary:', {
        mainWalletBalance: mainBalance,
        primarySubaccountBalance: primarySubaccountBalance,
        totalBalance: totalBalance,
      });

      // Create a simplified trading data context for balance queries
      tradingData = {
        walletAddress,
        accountOverview: {
          ...mainWalletOverview,
          // Override with total balance
          usdc_cross_withdrawable_balance: totalBalance,
          perp_equity_balance: (mainWalletOverview?.perp_equity_balance ?? 0) + (primarySubaccountOverview?.perp_equity_balance ?? 0),
        },
        primarySubaccountOverview,
        positions: [],
        openOrders: [],
        marketData: {
          markets: [],
          prices: [],
          orderbook: null,
          trades: [],
          candlesticks: {},
        },
      };

      progress.push('✅ Balance retrieved');
    } else {
      // For non-balance queries, fetch market sentiment and trading data
      // STEP 1: Fetch Market Sentiment (parallel with trading data prep)
      progress.push('📊 Fetching market sentiment...');
      console.log('[AI Route] Step 1: Fetching market sentiment');
      const marketSentimentPromise = marketSentimentService.getMarketSentiment();

      // STEP 2: Fetch Trading Data (large duration)
      progress.push('📈 Gathering trading data (30-day history)...');
      console.log('[AI Route] Step 2: Fetching trading data');
      const tradingDataPromise = tradingDataService.getTradingData(walletAddress, marketName);

      // Wait for both to complete
      [marketSentiment, tradingData] = await Promise.all([
        marketSentimentPromise,
        tradingDataPromise,
      ]);

      progress.push('✅ Market sentiment analyzed');
      progress.push('✅ Trading data collected');
      console.log('[AI Route] Steps 1-2 completed:', {
        sentiment: marketSentiment.overallSentiment,
        candlesticksCount: {
          '15m': tradingData.marketData.candlesticks['15m']?.length || 0,
          '1h': tradingData.marketData.candlesticks['1h']?.length || 0,
          '4h': tradingData.marketData.candlesticks['4h']?.length || 0,
          '1d': tradingData.marketData.candlesticks['1d']?.length || 0,
          '1w': tradingData.marketData.candlesticks['1w']?.length || 0,
        },
        orderbookDepth: tradingData.marketData.orderbook ? 
          (tradingData.marketData.orderbook.bids?.length || 0) + (tradingData.marketData.orderbook.asks?.length || 0) : 0,
        tradesCount: tradingData.marketData.trades?.length || 0,
      });
    }

    // STEP 3: Final AI Analysis
    progress.push('🤖 Analyzing with AI...');
    console.log('[AI Route] Step 3: Processing with AI');
    
    const context = {
      walletAddress,
      accountOverview: tradingData.accountOverview,
      primarySubaccountOverview: tradingData.primarySubaccountOverview,
      positions: tradingData.positions,
      openOrders: tradingData.openOrders,
      marketData: tradingData.marketData,
      marketSentiment: marketSentiment ? {
        overallSentiment: marketSentiment.overallSentiment,
        value: marketSentiment.value,
        classification: marketSentiment.classification,
        marketAnalysis: marketSentiment.marketAnalysis,
      } : undefined,
    };

    const aiResponse = await aiService.processQuery(message, context);
    const responseTime = Date.now() - startTime;

    progress.push('✅ AI analysis complete');
    console.log('[AI Route] Step 3 completed');

    // Build full message including data analysis
    let fullMessage = aiResponse.message || '';
    
    // Append detailed analysis from data field if it exists
    if (aiResponse.data) {
      const data = aiResponse.data;
      
      // Handle balance query data
      if (aiResponse.action === 'query_balance') {
        fullMessage += '\n\n## 💰 Balance Breakdown\n\n';
        if (data.totalEquity !== undefined) {
          fullMessage += `- **Total Equity:** $${Number(data.totalEquity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        }
        if (data.availableBalance !== undefined) {
          fullMessage += `- **Available Balance:** $${Number(data.availableBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        }
        if (data.unrealizedPnL !== undefined) {
          fullMessage += `- **Unrealized P&L:** $${Number(data.unrealizedPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        }
        if (data.totalMargin !== undefined) {
          fullMessage += `- **Total Margin:** $${Number(data.totalMargin).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        }
        if (data.leverageRatio !== undefined && data.leverageRatio !== 'N/A') {
          fullMessage += `- **Leverage Ratio:** ${data.leverageRatio}\n`;
        }
        if (data.maintenanceMargin !== undefined) {
          fullMessage += `- **Maintenance Margin:** $${Number(data.maintenanceMargin).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        }
        if (data.primarySubaccountBalance !== undefined) {
          fullMessage += `- **Primary Subaccount Balance:** $${Number(data.primarySubaccountBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        }
        if (data.openPositions !== undefined) {
          const positions = typeof data.openPositions === 'number' ? data.openPositions : (data.openPositions === 'None' ? 0 : data.openPositions);
          fullMessage += `- **Open Positions:** ${positions}\n`;
        }
        if (data.openOrders !== undefined) {
          const orders = typeof data.openOrders === 'number' ? data.openOrders : (data.openOrders === 'None' ? 0 : data.openOrders);
          fullMessage += `- **Open Orders:** ${orders}\n`;
        }
      }
      
      // Market sentiment analysis
      if (data.overallSentiment) {
        fullMessage += `\n\n📊 Overall Market Sentiment: ${data.overallSentiment}`;
      }
      
      // Market analysis for each asset
      if (data.marketAnalysis) {
        fullMessage += '\n\nMarket Analysis:\n';
        Object.entries(data.marketAnalysis).forEach(([asset, analysis]: [string, any]) => {
          if (asset !== 'fundingRates' && analysis && typeof analysis === 'object') {
            if (analysis.price && analysis.sentiment) {
              fullMessage += `\n• ${asset}: $${Number(analysis.price).toLocaleString()} - ${analysis.sentiment}`;
              if (analysis.reasoning) {
                fullMessage += `\n  ${analysis.reasoning}`;
              }
            }
          }
        });
        
        // Funding rates
        if (data.marketAnalysis.fundingRates) {
          const fr = data.marketAnalysis.fundingRates;
          fullMessage += `\n\nFunding Rates: ${fr.status} (Avg: ${fr.average || 'N/A'})`;
          if (fr.interpretation) {
            fullMessage += `\n${fr.interpretation}`;
          }
        }
      }
      
      // Key observations
      if (data.keyObservations && Array.isArray(data.keyObservations)) {
        fullMessage += '\n\nKey Observations:';
        data.keyObservations.forEach((obs: string) => {
          fullMessage += `\n• ${obs}`;
        });
      }
    }

    // Prepare trade signal data
    const tradeSignal = aiResponse.tradeSuggestion || 
      (aiResponse.tradeSuggestions && aiResponse.tradeSuggestions.length > 0 
        ? { multiple: true, count: aiResponse.tradeSuggestions.length, suggestions: aiResponse.tradeSuggestions }
        : null);

    // Save AI response to database
    await chatService.saveMessage(userId, 'assistant', fullMessage, {
      aiModel: 'anthropic/claude-3.5-sonnet',
      responseTimeMs: responseTime,
      tradeSignal: tradeSignal,
      marketDataSnapshot: {
        prices: tradingData.marketData.prices?.slice(0, 5),
        timestamp: Date.now(),
      },
    });

    console.log('[AI Route] Multi-step AI response generated:', {
      action: aiResponse.action,
      hasTradeSuggestion: !!aiResponse.tradeSuggestion,
      hasTradeSuggestions: !!aiResponse.tradeSuggestions,
      tradeSuggestionsCount: aiResponse.tradeSuggestions?.length || 0,
      responseTimeMs: responseTime,
      messageLength: fullMessage.length,
      progressSteps: progress.length,
    });

    // Return response with progress info
    res.json({
      ...aiResponse,
      message: fullMessage,
      progress: progress, // Include progress steps for UI display
      metadata: {
        sentiment: marketSentiment?.overallSentiment || null,
        dataPoints: {
          candlesticks: {
            '15m': tradingData.marketData?.candlesticks?.['15m']?.length || 0,
            '1h': tradingData.marketData?.candlesticks?.['1h']?.length || 0,
            '4h': tradingData.marketData?.candlesticks?.['4h']?.length || 0,
            '1d': tradingData.marketData?.candlesticks?.['1d']?.length || 0,
            '1w': tradingData.marketData?.candlesticks?.['1w']?.length || 0,
          },
          orderbookLevels: tradingData.marketData?.orderbook ? 
            (tradingData.marketData.orderbook.bids?.length || 0) + (tradingData.marketData.orderbook.asks?.length || 0) : 0,
          trades: tradingData.marketData?.trades?.length || 0,
        },
        responseTimeMs: responseTime,
      },
    });
  } catch (error: any) {
    console.error('[AI Route] Error processing multi-step chat:', {
      message: error.message,
      stack: error.stack,
      progress: progress,
    });
    res.status(500).json({
      error: 'Failed to process AI query',
      details: error.message,
      progress: progress, // Return progress even on error
    });
  }
});

/**
 * GET /api/ai/history
 * Get chat history for the authenticated user
 */
router.get('/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const walletAddress = req.user?.wallet_address;
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address not found' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get user ID
    const userResult = await pool.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    const userId = userResult.rows[0]?.id;

    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const messages = await chatService.getChatHistory(userId, limit, offset);

    res.json({ messages });
  } catch (error: any) {
    console.error('[AI Route] Error fetching chat history:', error);
    res.status(500).json({
      error: 'Failed to fetch chat history',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/ai/history
 * Delete all chat history for the authenticated user
 */
router.delete('/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const walletAddress = req.user?.wallet_address;
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address not found' });
    }

    // Get user ID
    const userResult = await pool.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    const userId = userResult.rows[0]?.id;

    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    await chatService.deleteChatHistory(userId);

    res.json({ message: 'Chat history deleted successfully' });
  } catch (error: any) {
    console.error('[AI Route] Error deleting chat history:', error);
    res.status(500).json({
      error: 'Failed to delete chat history',
      details: error.message,
    });
  }
});

export default router;
