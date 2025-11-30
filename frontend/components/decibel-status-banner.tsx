'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/lib/wallet';
import { useAuth } from '@/lib/auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface DecibelStatus {
  hasAccount: boolean;
  hasBalance: boolean;
  balance: number;
}

const DECIBEL_URL = 'https://app.decibel.trade';

export function DecibelStatusBanner() {
  const { isConnected, address } = useWallet();
  const { user, token } = useAuth();
  const [status, setStatus] = useState<DecibelStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!isConnected || !address || !token || !user) {
      setShowBanner(false);
      return;
    }

    const checkStatus = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/api/decibel/account-status');
        const data = response.data;
        setStatus(data);
        // Show banner if no account or no balance
        setShowBanner(!data.hasAccount || !data.hasBalance);
      } catch (error: any) {
        console.error('Error checking Decibel status:', error);
        // If it's a 401 or 500, treat as "no account" to show banner
        // Otherwise, don't show banner (assume everything is fine)
        if (error?.response?.status === 401 || error?.response?.status === 500) {
          setStatus({ hasAccount: false, hasBalance: false, balance: 0 });
          setShowBanner(true);
        } else {
          setShowBanner(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [isConnected, address, token, user]);

  if (!showBanner || isLoading) {
    return null;
  }

  return (
    <div className="container px-4 py-3">
      <Alert className="border-yellow-500/50 bg-yellow-500/10">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800 dark:text-yellow-200">
          {!status?.hasAccount
            ? 'Decibel Account Required'
            : 'Fund Your Decibel Account'}
        </AlertTitle>
        <AlertDescription className="text-yellow-700 dark:text-yellow-300 mt-2">
          {!status?.hasAccount ? (
            <>
              You need to create a Decibel account and deposit USDC before you can
              trade. Go to Decibel to sign up and fund your account.
            </>
          ) : (
            <>
              Your Decibel account has no balance. Please deposit USDC to start
              trading.
            </>
          )}
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600"
              onClick={() => window.open(DECIBEL_URL, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Go to Decibel
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

