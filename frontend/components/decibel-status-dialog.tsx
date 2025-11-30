'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/lib/wallet';
import { useAuth } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Copy, Check, AlertCircle, Wallet, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

interface DecibelStatus {
  hasAccount: boolean;
  hasBalance: boolean;
  balance: number;
  subaccounts: Array<{
    subaccount_address: string;
    primary_account_address: string;
    is_primary: boolean;
    is_active: boolean;
    custom_label?: string | null;
  }>;
  primarySubaccount?: {
    address: string;
    isActive: boolean;
    balance: number;
    overview?: any;
  };
  mainWalletOverview?: any;
}

const DECIBEL_URL = 'https://app.decibel.trade';

export function DecibelStatusDialog() {
  const { isConnected, address } = useWallet();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<DecibelStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  useEffect(() => {
    if (open && isConnected && address && token && user) {
      checkStatus();
    }
  }, [open, isConnected, address, token, user]);

  const checkStatus = async () => {
    setIsLoading(true);
    console.log('[Frontend] Checking Decibel status...');
    console.log('[Frontend] Wallet address:', address);
    console.log('[Frontend] User:', user);
    console.log('[Frontend] Token exists:', !!token);
    
    try {
      console.log('[Frontend] Making API request to /api/decibel/account-status');
      const response = await api.get('/api/decibel/account-status');
      console.log('[Frontend] API response status:', response.status);
      console.log('[Frontend] API response data:', JSON.stringify(response.data, null, 2));
      
      const data = response.data;
      setStatus(data);
      console.log('[Frontend] Status updated:', data);
    } catch (error: any) {
      console.error('[Frontend] Error checking Decibel status:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
        },
      });
      
      // Treat 401/500 as no account
      if (error?.response?.status === 401 || error?.response?.status === 500) {
        console.log('[Frontend] Treating error as no account, setting status to empty');
        setStatus({ hasAccount: false, hasBalance: false, balance: 0, subaccounts: [] });
      }
    } finally {
      setIsLoading(false);
      console.log('[Frontend] Status check completed');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const primarySubaccount = status?.subaccounts.find((sub) => sub.is_primary);

  if (!isConnected || !address) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative"
        >
          <Coins className="h-4 w-4 mr-2" />
          Decibel Status
          {status && !status.hasAccount && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 h-2 w-2 bg-yellow-500 rounded-full"
            />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Decibel Account Status
          </DialogTitle>
          <DialogDescription>
            View your Decibel trading account information
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-8"
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </motion.div>
          ) : !status?.hasAccount ? (
            <motion.div
              key="no-account"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                    Account Not Found
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                    You need to create a Decibel account and deposit USDC before you can trade.
                  </p>
                  <Button
                    size="sm"
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                    onClick={() => window.open(DECIBEL_URL, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Go to Decibel
                  </Button>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Wallet Address</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {truncateAddress(address)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copyToClipboard(address, 'Wallet address')}
                    >
                      {copiedAddress === address ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="has-account"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-800 dark:text-green-200">
                      Account Active
                    </h4>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      {status.hasBalance ? 'Ready to trade' : 'Fund your account to start trading'}
                    </p>
                  </div>
                </div>
                <Badge variant={status.hasBalance ? 'default' : 'secondary'}>
                  {status.hasBalance ? 'Funded' : 'No Balance'}
                </Badge>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Wallet Address</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-background px-2 py-1 rounded">
                      {truncateAddress(address)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copyToClipboard(address, 'Wallet address')}
                    >
                      {copiedAddress === address ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {primarySubaccount && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Primary Subaccount</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-background px-2 py-1 rounded">
                        {truncateAddress(primarySubaccount.subaccount_address)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          copyToClipboard(
                            primarySubaccount.subaccount_address,
                            'Subaccount address'
                          )
                        }
                      >
                        {copiedAddress === primarySubaccount.subaccount_address ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {status.primarySubaccount && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Primary Subaccount Status</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={status.primarySubaccount.isActive ? 'default' : 'secondary'} className="text-xs">
                        {status.primarySubaccount.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20"
                >
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Balance</span>
                    {status.primarySubaccount && (
                      <span className="text-xs text-muted-foreground">
                        (Primary Subaccount: {truncateAddress(status.primarySubaccount.address)})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">
                      ${(status.primarySubaccount?.balance ?? status.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      USDC
                    </Badge>
                  </div>
                </motion.div>
              </div>

              {!status.hasBalance && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="pt-2"
                >
                  <Button
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                    onClick={() => window.open(DECIBEL_URL, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Fund Account on Decibel
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

