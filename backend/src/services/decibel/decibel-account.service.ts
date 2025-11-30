import { decibelClient, getDecibelHeaders } from './decibel-client';
import { env } from '../../config/env';
import type { DecibelSubaccount, DecibelAccountOverview } from './decibel-types';

export class DecibelAccountService {
  /**
   * Get all subaccounts for an owner address
   */
  async getSubaccounts(ownerAddress: string): Promise<DecibelSubaccount[]> {
    console.log('[DecibelAccountService] Getting subaccounts for address:', ownerAddress);
    console.log('[DecibelAccountService] API Key set:', !!env.DECIBEL_API_KEY);
    console.log('[DecibelAccountService] Base URL:', env.DECIBEL_BASE_URL);
    
    try {
      const url = '/api/v1/subaccounts';
      const params = { owner: ownerAddress };
      console.log('[DecibelAccountService] Request URL:', `${env.DECIBEL_BASE_URL}${url}`);
      console.log('[DecibelAccountService] Request params:', params);
      
      const config = {
        params,
        headers: getDecibelHeaders(true),
      };
      
      console.log('[DecibelAccountService] Request config headers:', Object.keys(config.headers));
      
      const response = await decibelClient.get<DecibelSubaccount[]>(url, config);
      
      console.log('[DecibelAccountService] Subaccounts response status:', response.status);
      console.log('[DecibelAccountService] Subaccounts response data:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('[DecibelAccountService] Error getting subaccounts:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
      
      // 401 = no auth/not set up, 404/400 = no subaccounts found
      if (error.response?.status === 401 || error.response?.status === 404 || error.response?.status === 400) {
        console.log('[DecibelAccountService] Treating as no subaccounts found (status:', error.response?.status, ')');
        return [];
      }
      throw error;
    }
  }

  /**
   * Get account overview for a user address
   */
  async getAccountOverview(userAddress: string): Promise<DecibelAccountOverview | null> {
    console.log('[DecibelAccountService] Getting account overview for address:', userAddress);
    
    try {
      const url = '/api/v1/account_overviews';
      const params = { user: userAddress };
      console.log('[DecibelAccountService] Request URL:', `${env.DECIBEL_BASE_URL}${url}`);
      console.log('[DecibelAccountService] Request params:', params);
      
      const config = {
        params,
        headers: getDecibelHeaders(true),
      };
      
      console.log('[DecibelAccountService] Request config headers:', Object.keys(config.headers));
      
      const response = await decibelClient.get<DecibelAccountOverview>(url, config);
      
      console.log('[DecibelAccountService] Account overview response status:', response.status);
      console.log('[DecibelAccountService] Account overview response data:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('[DecibelAccountService] Error getting account overview:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
      
      // 401 = no auth/not set up, 404/400 = no account found
      if (error.response?.status === 401 || error.response?.status === 404 || error.response?.status === 400) {
        console.log('[DecibelAccountService] Treating as no account found (status:', error.response?.status, ')');
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if user has Decibel account with balance
   * Also fetches status for the primary subaccount
   */
  async checkAccountStatus(walletAddress: string): Promise<{
    hasAccount: boolean;
    hasBalance: boolean;
    balance: number;
    subaccounts: DecibelSubaccount[];
    primarySubaccount?: {
      address: string;
      isActive: boolean;
      balance: number;
      overview?: DecibelAccountOverview | null;
    };
    mainWalletOverview?: DecibelAccountOverview | null;
  }> {
    console.log('[DecibelAccountService] ========================================');
    console.log('[DecibelAccountService] Checking account status for:', walletAddress);
    console.log('[DecibelAccountService] ========================================');
    
    // Step 1: Get subaccounts
    const subaccounts = await this.getSubaccounts(walletAddress);
    console.log('[DecibelAccountService] Subaccounts found:', subaccounts.length);
    
    // Step 2: Get account overview for MAIN WALLET ADDRESS
    console.log('[DecibelAccountService] ========================================');
    console.log('[DecibelAccountService] 📊 CALLING ACCOUNT OVERVIEW API #1: MAIN WALLET');
    console.log('[DecibelAccountService] Main wallet address:', walletAddress);
    console.log('[DecibelAccountService] ========================================');
    const mainWalletOverview = await this.getAccountOverview(walletAddress);
    console.log('[DecibelAccountService] ✅ Main wallet overview result:', mainWalletOverview ? 'Found' : 'Not found');
    if (mainWalletOverview) {
      console.log('[DecibelAccountService] Main wallet balance (usdc_cross_withdrawable_balance):', mainWalletOverview.usdc_cross_withdrawable_balance);
      console.log('[DecibelAccountService] Main wallet perp_equity_balance:', mainWalletOverview.perp_equity_balance);
    }

    const hasAccount = subaccounts.length > 0;
    const balance = mainWalletOverview?.usdc_cross_withdrawable_balance ?? 0;
    const hasBalance = balance > 0;

    // Step 3: Find primary subaccount and get its overview
    const primarySubaccount = subaccounts.find((sub) => sub.is_primary);
    
    let primarySubaccountOverview: DecibelAccountOverview | null = null;
    let primarySubaccountInfo = undefined;
    
    if (primarySubaccount) {
      console.log('[DecibelAccountService] ========================================');
      console.log('[DecibelAccountService] 📊 CALLING ACCOUNT OVERVIEW API #2: PRIMARY SUBACCOUNT');
      console.log('[DecibelAccountService] Primary subaccount address:', primarySubaccount.subaccount_address);
      console.log('[DecibelAccountService] ========================================');
      
      // Get account overview for primary subaccount address
      primarySubaccountOverview = await this.getAccountOverview(primarySubaccount.subaccount_address);
      console.log('[DecibelAccountService] ✅ Primary subaccount overview result:', primarySubaccountOverview ? 'Found' : 'Not found');
      if (primarySubaccountOverview) {
        console.log('[DecibelAccountService] Primary subaccount balance (usdc_cross_withdrawable_balance):', primarySubaccountOverview.usdc_cross_withdrawable_balance);
        console.log('[DecibelAccountService] Primary subaccount perp_equity_balance:', primarySubaccountOverview.perp_equity_balance);
      }
      
      primarySubaccountInfo = {
        address: primarySubaccount.subaccount_address,
        isActive: primarySubaccount.is_active,
        balance: primarySubaccountOverview?.usdc_cross_withdrawable_balance ?? 0,
        overview: primarySubaccountOverview,
      };
    } else {
      console.log('[DecibelAccountService] ⚠️  No primary subaccount found');
    }

    console.log('[DecibelAccountService] ========================================');
    console.log('[DecibelAccountService] 📋 SUMMARY:');
    console.log('[DecibelAccountService] - Main wallet balance:', balance);
    console.log('[DecibelAccountService] - Primary subaccount balance:', primarySubaccountInfo?.balance ?? 'N/A');
    console.log('[DecibelAccountService] ========================================');

    const result = {
      hasAccount,
      hasBalance,
      balance,
      subaccounts,
      primarySubaccount: primarySubaccountInfo,
      mainWalletOverview,
    };
    
    console.log('[DecibelAccountService] Final status result:', JSON.stringify(result, null, 2));

    return result;
  }
}

