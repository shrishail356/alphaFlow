'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/lib/wallet';
import { useAuth } from '@/lib/auth';
import { Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

export function DecibelBalanceDisplay() {
  const { isConnected, address } = useWallet();
  const { user, token } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address && token && user) {
      fetchBalance();
    } else {
      setBalance(null);
    }
  }, [isConnected, address, token, user]);

  const fetchBalance = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/decibel/account-status');
      const data = response.data;
      
      // Use primary subaccount balance if available, otherwise use main wallet balance
      const displayBalance = data.primarySubaccount?.balance ?? data.balance ?? 0;
      setBalance(displayBalance);
    } catch (error: any) {
      // Silently fail - don't show error in header
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected || !address || balance === null) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20">
      <Coins className="h-4 w-4 text-primary" />
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-primary">
          ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <Badge variant="outline" className="text-xs px-1.5 py-0">
          USDC
        </Badge>
      </div>
    </div>
  );
}

