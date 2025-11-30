import {
  Aptos,
  AptosConfig,
  Ed25519Account,
  Ed25519PrivateKey,
  Network,
  AccountAddress,
  createObjectAddress,
} from '@aptos-labs/ts-sdk';
import axios from 'axios';
import { env } from '../config/env';
import { decibelService } from './decibel/decibel.service';

// Decibel package address
// Testnet package address: 0x1f513904b7568445e3c291a6c58cb272db017d8a72aea563d5664666221d5f75
// Netna/Staging package address: 0xb8a5788314451ce4d2fbbad32e1bad88d4184b73943b7fe5166eab93cf1a5a95
const DECIBEL_PACKAGE = '0x1f513904b7568445e3c291a6c58cb272db017d8a72aea563d5664666221d5f75';

export interface PlaceOrderParams {
  subaccountAddr: string;
  marketName: string; // e.g., "BTC/USD"
  price: number; // Decimal price (e.g., 50000.50)
  size: number; // Decimal size (e.g., 0.1)
  isBuy: boolean;
  timeInForce?: 0 | 1 | 2; // 0 = GoodTillCanceled, 1 = PostOnly, 2 = ImmediateOrCancel
  isReduceOnly?: boolean;
  clientOrderId?: string;
  stopPrice?: number;
  tpTriggerPrice?: number;
  tpLimitPrice?: number;
  slTriggerPrice?: number;
  slLimitPrice?: number;
}

export interface BuildOrderTransactionParams {
  subaccountAddr: string;
  marketName: string;
  price: number;
  size: number;
  isBuy: boolean;
  orderType: 'market' | 'limit';
  slPrice?: number;
  tpPrice?: number;
  clientOrderId?: string;
}

export interface DelegateParams {
  subaccountAddr: string;
  accountToDelegateTo: string;
  expirationTimestamp?: number; // Unix timestamp in seconds
}

export interface TradeExecutionResult {
  success: boolean;
  transactionHash?: string;
  orderId?: string;
  error?: string;
}

/**
 * Convert decimal price to chain units based on market configuration
 */
function priceToChainUnits(price: number, pxDecimals: number): number {
  return Math.floor(price * 10 ** pxDecimals);
}

/**
 * Convert decimal size to chain units based on market configuration
 */
function sizeToChainUnits(size: number, szDecimals: number): number {
  return Math.floor(size * 10 ** szDecimals);
}

/**
 * Round price to valid tick size
 */
function roundToTickSize(price: number, tickSize: number, pxDecimals: number): number {
  const priceInChainUnits = price * 10 ** pxDecimals;
  const rounded = Math.round(priceInChainUnits / tickSize) * tickSize;
  return rounded / 10 ** pxDecimals;
}


/**
 * Get primary subaccount address for a user
 */
export function getPrimarySubaccountAddr(userAddress: string): string {
  const seed = new TextEncoder().encode('decibel_dex_primary');
  return createObjectAddress(
    AccountAddress.fromString(userAddress),
    seed
  ).toString();
}

export class DecibelTradingService {
  private aptos: Aptos;
  private backendAccount: Ed25519Account | null = null;

  constructor() {
    // Initialize Aptos client for TESTNET (matching DECIBEL_BASE_URL)
    // User is using: https://api.testnet.aptoslabs.com/decibel
    
    // Log network configuration
    console.log('[DecibelTrading] Initializing with network configuration:');
    console.log('[DecibelTrading] - Network: TESTNET');
    console.log('[DecibelTrading] - DECIBEL_BASE_URL:', env.DECIBEL_BASE_URL);
    console.log('[DecibelTrading] - Fullnode URL: https://api.testnet.aptoslabs.com/v1');
    console.log('[DecibelTrading] - Decibel Package (TESTNET):', DECIBEL_PACKAGE);
    
    // Configure fullnode with API key if provided (for authenticated requests to avoid rate limits)
    const fullnodeConfig: any = {
      url: 'https://api.testnet.aptoslabs.com/v1',
    };
    
    // Add API key to fullnode requests if provided
    if (env.APTOS_NODE_API_KEY) {
      const apiKey = env.APTOS_NODE_API_KEY;
      console.log('[DecibelTrading] - APTOS_NODE_API_KEY: configured (first 20 chars):', apiKey.substring(0, 20) + '...');
      
      // Create a custom fetch function that adds Authorization header
      fullnodeConfig.fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
        const headers = new Headers(init?.headers);
        headers.set('Authorization', `Bearer ${apiKey}`);
        return fetch(url, {
          ...init,
          headers,
        });
      };
    } else {
      console.log('[DecibelTrading] - APTOS_NODE_API_KEY: not configured');
    }
    
    const aptosConfig = new AptosConfig({
      network: Network.TESTNET,
      fullnode: fullnodeConfig,
    });
    
    this.aptos = new Aptos(aptosConfig);
    console.log('[DecibelTrading] Aptos client initialized with network:', Network.TESTNET);

    // Initialize backend account if private key is provided
    if (env.BACKEND_WALLET_PRIVATE_KEY) {
      try {
        this.backendAccount = new Ed25519Account({
          privateKey: new Ed25519PrivateKey(env.BACKEND_WALLET_PRIVATE_KEY),
        });
        console.log('[DecibelTrading] Backend wallet initialized:', this.backendAccount.accountAddress.toString());
      } catch (error: any) {
        console.error('[DecibelTrading] Error initializing backend wallet:', error.message);
      }
    } else {
      console.warn('[DecibelTrading] BACKEND_WALLET_PRIVATE_KEY not set - trade execution will not work');
    }
  }

  /**
   * Place an order on behalf of a delegated subaccount
   * 
   * NOTE: This uses TESTNET - orders will be placed on Aptos testnet
   * Package address: 0xb8a5788314451ce4d2fbbad32e1bad88d4184b73943b7fe5166eab93cf1a5a95
   */
  async placeOrder(params: PlaceOrderParams): Promise<TradeExecutionResult> {
    if (!this.backendAccount) {
      return {
        success: false,
        error: 'Backend wallet not configured',
      };
    }

    try {
      // Get market configuration
      const markets = await decibelService.getMarkets();
      const market = markets.find(m => m.market_name === params.marketName);
      
      if (!market) {
        return {
          success: false,
          error: `Market ${params.marketName} not found`,
        };
      }

      // Get market address from Decibel API
      const marketAddr = market.market_addr;

      // Format price and size to chain units
      const priceInChainUnits = priceToChainUnits(params.price, market.px_decimals);
      const sizeInChainUnits = sizeToChainUnits(params.size, market.sz_decimals);

      // Round price to tick size
      const roundedPrice = roundToTickSize(params.price, market.tick_size, market.px_decimals);
      const roundedPriceInChainUnits = priceToChainUnits(roundedPrice, market.px_decimals);

      // Validate minimum size
      if (sizeInChainUnits < market.min_size) {
        return {
          success: false,
          error: `Order size ${params.size} is below minimum size ${market.min_size / 10 ** market.sz_decimals}`,
        };
      }

      // Build transaction
      const transaction = await this.aptos.transaction.build.simple({
        sender: this.backendAccount.accountAddress,
        data: {
          function: `${DECIBEL_PACKAGE}::dex_accounts::place_order_to_subaccount`,
          typeArguments: [],
          functionArguments: [
            params.subaccountAddr, // subaccount address
            marketAddr, // market address
            roundedPriceInChainUnits, // price in chain units
            sizeInChainUnits, // size in chain units
            params.isBuy, // isBuy
            params.timeInForce ?? 0, // timeInForce (0 = GoodTillCanceled)
            params.isReduceOnly ?? false, // isReduceOnly
            params.clientOrderId || null, // clientOrderId
            params.stopPrice ? priceToChainUnits(params.stopPrice, market.px_decimals) : null, // stopPrice
            params.tpTriggerPrice ? priceToChainUnits(params.tpTriggerPrice, market.px_decimals) : null, // tpTriggerPrice
            params.tpLimitPrice ? priceToChainUnits(params.tpLimitPrice, market.px_decimals) : null, // tpLimitPrice
            params.slTriggerPrice ? priceToChainUnits(params.slTriggerPrice, market.px_decimals) : null, // slTriggerPrice
            params.slLimitPrice ? priceToChainUnits(params.slLimitPrice, market.px_decimals) : null, // slLimitPrice
            null, // builderAddr
            null, // builderFee
          ],
        },
      });

      // Sign transaction
      const senderAuthenticator = this.aptos.transaction.sign({
        signer: this.backendAccount,
        transaction,
      });

      // Submit transaction
      const pendingTransaction = await this.aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      // Wait for confirmation
      const executedTx = await this.aptos.waitForTransaction({
        transactionHash: pendingTransaction.hash,
      });

      // Extract order ID from transaction events (if available)
      let orderId: string | undefined;
      // Check if transaction has events property (type guard)
      if ('events' in executedTx && executedTx.events) {
        // Try to find order ID in events
        // This depends on Decibel's event structure
        for (const event of executedTx.events) {
          if (event.type?.includes('order') || event.type?.includes('Order')) {
            // Parse order ID from event data if available
            // This is a placeholder - actual event structure may differ
          }
        }
      }

      console.log('[DecibelTrading] Order placed successfully:', {
        transactionHash: executedTx.hash,
        market: params.marketName,
        price: params.price,
        size: params.size,
        side: params.isBuy ? 'buy' : 'sell',
      });

      return {
        success: true,
        transactionHash: executedTx.hash,
        orderId,
      };
    } catch (error: any) {
      console.error('[DecibelTrading] Error placing order:', error);
      return {
        success: false,
        error: error.message || 'Failed to place order',
      };
    }
  }

  /**
   * Build order transaction (user signs this on frontend - NO DELEGATION NEEDED)
   * Returns transaction data that frontend can sign with user's wallet
   */
  async buildOrderTransaction(params: BuildOrderTransactionParams): Promise<{
    success: boolean;
    transaction?: any;
    error?: string;
  }> {
    try {
      // Get market info
      const markets = await decibelService.getMarkets();
      const market = markets.find(m => m.market_name === params.marketName);
      
      if (!market) {
        return {
          success: false,
          error: `Market ${params.marketName} not found`,
        };
      }

      const marketAddr = market.market_addr;

      // Format price and size to chain units
      const priceInChainUnits = priceToChainUnits(params.price, market.px_decimals);
      const sizeInChainUnits = sizeToChainUnits(params.size, market.sz_decimals);

      // Round price to tick size
      const roundedPrice = roundToTickSize(params.price, market.tick_size, market.px_decimals);
      const roundedPriceInChainUnits = priceToChainUnits(roundedPrice, market.px_decimals);

      // Validate minimum size
      if (sizeInChainUnits < market.min_size) {
        return {
          success: false,
          error: `Order size ${params.size} is below minimum size ${market.min_size / 10 ** market.sz_decimals}`,
        };
      }

      // Determine time in force
      let timeInForce: 0 | 1 | 2 = 0; // GoodTillCanceled
      if (params.orderType === 'market') {
        timeInForce = 2; // ImmediateOrCancel
      }

      // Build transaction data (user will sign on frontend)
      // Function signature: place_order_to_subaccount(
      //   signer, subaccount, market, price, size, isBuy, timeInForce, isReduceOnly,
      //   clientOrderId, stopPrice, tpTriggerPrice, tpLimitPrice, slTriggerPrice, slLimitPrice, builderAddr, builderFee
      // )
      // Total: 15 arguments (signer is provided by wallet, so we pass 14)
      const functionArguments: any[] = [
        params.subaccountAddr, // 1. subaccount address (address)
        marketAddr, // 2. market address (object address)
        roundedPriceInChainUnits, // 3. price in chain units (u64)
        sizeInChainUnits, // 4. size in chain units (u64)
        params.isBuy, // 5. isBuy (bool)
        timeInForce, // 6. timeInForce (u8)
        false, // 7. isReduceOnly (bool)
        params.clientOrderId || null, // 8. clientOrderId (Option<String>)
        null, // 9. stopPrice (Option<u64>)
        params.tpPrice ? priceToChainUnits(params.tpPrice, market.px_decimals) : null, // 10. tpTriggerPrice (Option<u64>)
        params.tpPrice ? priceToChainUnits(params.tpPrice, market.px_decimals) : null, // 11. tpLimitPrice (Option<u64>)
        params.slPrice ? priceToChainUnits(params.slPrice, market.px_decimals) : null, // 12. slTriggerPrice (Option<u64>)
        params.slPrice ? priceToChainUnits(params.slPrice, market.px_decimals) : null, // 13. slLimitPrice (Option<u64>)
        null, // 14. builderAddr (Option<address>)
        null, // 15. builderFee (Option<u64>)
      ];

      // Format Option types correctly for Move
      // When sending directly to Petra (not using SDK build), Option::None must be {"vec": []}
      // Option::Some(value) should be the value itself
      // Indices 7-14 are Option types:
      // 7: clientOrderId (Option<String>)
      // 8: stopPrice (Option<u64>)
      // 9: tpTriggerPrice (Option<u64>)
      // 10: tpLimitPrice (Option<u64>)
      // 11: slTriggerPrice (Option<u64>)
      // 12: slLimitPrice (Option<u64>)
      // 13: builderAddr (Option<address>)
      // 14: builderFee (Option<u64>)
      const cleanArguments = functionArguments.map((arg, index) => {
        // For Option types (indices 7-14), format None as {"vec": []}
        if (index >= 7 && index <= 14) {
          if (arg === undefined || arg === null) {
            return { vec: [] }; // Option::None format for Move
          }
          // Option::Some(value) - return the value as-is
          return arg;
        }
        // For non-Option types (indices 0-6), return as-is (convert undefined to null for safety)
        return arg === undefined ? null : arg;
      });

      const transactionData = {
        function: `${DECIBEL_PACKAGE}::dex_accounts::place_order_to_subaccount`,
        typeArguments: [], // Empty array for type arguments
        functionArguments: cleanArguments, // All 15 arguments
      };

      console.log('[DecibelTrading] Order transaction data built:', {
        function: transactionData.function,
        market: params.marketName,
        price: params.price,
        size: params.size,
        side: params.isBuy ? 'buy' : 'sell',
      });

      return {
        success: true,
        transaction: transactionData,
      };
    } catch (error: any) {
      console.error('[DecibelTrading] Error building order transaction:', error);
      return {
        success: false,
        error: error.message || 'Failed to build order transaction',
      };
    }
  }

  /**
   * Build delegation transaction (user signs this on frontend)
   * Follows Decibel's approach: First fetch ABI, then build transaction
   * Returns transaction data that frontend can sign with user's wallet
   * 
   * NOTE: This uses TESTNET - transactions will be submitted to Aptos testnet
   * Package address: 0xb8a5788314451ce4d2fbbad32e1bad88d4184b73943b7fe5166eab93cf1a5a95
   */
  async buildDelegationTransaction(userAddress: string, subaccountAddr: string): Promise<{
    transaction: any;
    backendAddress: string;
    error?: string;
  }> {
    try {
      const backendAddress = this.getBackendAddress();
      if (!backendAddress) {
        return {
          transaction: null,
          backendAddress: '',
          error: 'Backend wallet not configured',
        };
      }

      console.log('[DecibelTrading] Building delegation transaction...');
      console.log('[DecibelTrading] Network Configuration:');
      console.log('[DecibelTrading] - Backend Network: TESTNET');
      console.log('[DecibelTrading] - Decibel Package: ', DECIBEL_PACKAGE);
      console.log('[DecibelTrading] - Fullnode URL: https://api.testnet.aptoslabs.com/v1');
      console.log('[DecibelTrading] - User Address:', userAddress);
      console.log('[DecibelTrading] - Subaccount Address:', subaccountAddr);
      console.log('[DecibelTrading] - Backend Address:', backendAddress);
      console.log('[DecibelTrading] Step 1: Fetching ABI from fullnode');
      
      // Step 1: Fetch ABI from Aptos fullnode (like Decibel does)
      // GET https://api.testnet.aptoslabs.com/v1/accounts/{package}/module/dex_accounts
      // Use DECIBEL_API_KEY with Origin header (same as Decibel app)
      try {
        const abiUrl = `https://api.testnet.aptoslabs.com/v1/accounts/${DECIBEL_PACKAGE}/module/dex_accounts`;
        const moduleResponse = await axios.get(abiUrl, {
          headers: {
            'Authorization': `Bearer ${env.DECIBEL_API_KEY}`,
            'Origin': 'https://app.decibel.trade',
            'Content-Type': 'application/json',
          },
        });

        console.log('[DecibelTrading] ABI fetched successfully');
        
        // Access ABI from the response
        if (moduleResponse.data?.abi) {
          const abi = moduleResponse.data.abi;
          console.log('[DecibelTrading] Module name:', abi.name);
          console.log('[DecibelTrading] Exposed functions count:', abi.exposed_functions?.length || 0);
          
          // Find the delegation function in the ABI
          const delegateFunction = abi.exposed_functions?.find(
            (fn: any) => fn.name === 'delegate_trading_to_for_subaccount' || fn.name === 'delegate_trading_to'
          );
          
          if (delegateFunction) {
            console.log('[DecibelTrading] Found delegation function:', delegateFunction.name);
            console.log('[DecibelTrading] Function params:', delegateFunction.params);
          }
        }
      } catch (abiError: any) {
        console.warn('[DecibelTrading] Could not fetch ABI (will use hardcoded function path):', abiError.message);
        if (abiError.response) {
          console.warn('[DecibelTrading] ABI fetch error response:', abiError.response.status, abiError.response.data);
        }
        // Continue with hardcoded function path if ABI fetch fails
      }

      console.log('[DecibelTrading] Step 2: Building transaction data');
      console.log('[DecibelTrading] Transaction Details:');
      console.log('[DecibelTrading] - Network: TESTNET (required by Petra wallet)');
      console.log('[DecibelTrading] - Function Module: dex_accounts');
      console.log('[DecibelTrading] - Function Name: delegate_trading_to_for_subaccount');
      
      // Step 2: Build transaction data (matching Decibel's format)
      // Based on captured transaction from delegate.md:
      // Function: {package}::dex_accounts::delegate_trading_to_for_subaccount
      // The ABI shows the function name is "delegate_trading_to_for_subaccount"
      // Parameters: (signer, subaccount_address, account_to_delegate_to, expiration_timestamp_secs)
      // The expiration is Option<u64> - for no expiration, pass null (Option::None)
      // Note: signer is provided by wallet, so we only pass 3 arguments
      const transactionData = {
        function: `${DECIBEL_PACKAGE}::dex_accounts::delegate_trading_to_for_subaccount`,
        typeArguments: [], // Must be an array, even if empty
        functionArguments: [
          subaccountAddr, // subaccount_address (address) - first arg
          backendAddress, // account_to_delegate_to (address) - second arg
          null, // expirationTimestamp: null = Option::None (no expiration) - third arg
          // To set expiration, pass Unix timestamp in seconds: 1735689600
        ],
      };

      console.log('[DecibelTrading] Delegation transaction data built:');
      console.log('[DecibelTrading] - Full Function Path:', transactionData.function);
      console.log('[DecibelTrading] - Type Arguments:', JSON.stringify(transactionData.typeArguments));
      console.log('[DecibelTrading] - Function Arguments:', JSON.stringify(transactionData.functionArguments));
      console.log('[DecibelTrading] - Subaccount Address:', subaccountAddr);
      console.log('[DecibelTrading] - Backend Address:', backendAddress);
      console.log('[DecibelTrading] - Expiration Timestamp: null (no expiration)');
      console.log('[DecibelTrading] - Arguments Count:', transactionData.functionArguments.length);
      console.log('[DecibelTrading] ⚠️  IMPORTANT: User must connect Petra wallet to TESTNET network!');

      return {
        transaction: transactionData,
        backendAddress,
      };
    } catch (error: any) {
      console.error('[DecibelTrading] Error building delegation transaction:', error);
      return {
        transaction: null,
        backendAddress: '',
        error: error.message || 'Failed to build delegation transaction',
      };
    }
  }

  /**
   * Get backend wallet address (for delegation)
   */
  getBackendAddress(): string | null {
    return this.backendAccount?.accountAddress.toString() || null;
  }
}

export const decibelTradingService = new DecibelTradingService();

