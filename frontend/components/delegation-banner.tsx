'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useWallet } from '@/lib/wallet';
import { useAuth } from '@/lib/auth';

interface DelegationStatus {
  isDelegated: boolean;
  hasSubaccount: boolean;
  subaccountAddr?: string;
  backendAddress?: string;
  delegations?: Array<{
    delegatedAccount: string;
    expirationTime?: number;
    permissionType: string;
  }>;
}

export function DelegationBanner() {
  const { address, walletType } = useWallet();
  const { token } = useAuth();
  const [status, setStatus] = useState<DelegationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDelegating, setIsDelegating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (address && token) {
      checkDelegationStatus();
    } else {
      setIsLoading(false);
    }
  }, [address, token]);

  // Open dialog when delegation is needed
  useEffect(() => {
    if (!isLoading && status && !status.isDelegated && status.hasSubaccount) {
      setIsOpen(true);
    } else if (status?.isDelegated) {
      setIsOpen(false);
    }
  }, [status, isLoading]);

  const checkDelegationStatus = async () => {
    if (!address || !token) return;

    try {
      setIsLoading(true);
      const response = await api.get('/api/trading/delegation/status');
      setStatus(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error checking delegation status:', err);
      setError(err.response?.data?.error || 'Failed to check delegation status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelegate = async () => {
    if (!address || !status?.subaccountAddr || !status?.backendAddress) return;

    setIsDelegating(true);
    setError(null);

    try {
      // Get transaction data from backend
      const response = await api.post('/api/trading/delegation/build', {
        subaccountAddr: status.subaccountAddr,
      });

      const { transaction, backendAddress } = response.data;

      if (!transaction || !transaction.function) {
        throw new Error('Invalid transaction data received from backend');
      }

      // Sign transaction with user's wallet
      if (walletType === 'petra' && window.aptos) {
        try {
          console.log('[Delegation] Frontend Network Configuration:');
          console.log('[Delegation] - Expected Network: TESTNET');
          console.log('[Delegation] - Wallet Type:', walletType);
          console.log('[Delegation] - Transaction Function:', transaction.function);
          console.log('[Delegation] - Backend Address:', backendAddress);
          
          // Get user's account address first
          const account = await window.aptos.account();
          if (!account?.address) {
            throw new Error('Failed to get account address from wallet');
          }
          
          console.log('[Delegation] - User Wallet Address:', account.address);
          console.log('[Delegation] - ⚠️  IMPORTANT: Ensure Petra wallet is connected to TESTNET network!');
          console.log('[Delegation] - To check/switch: Open Petra wallet → Settings → Network → Select "Testnet"');

          // Prepare function arguments - ensure proper formatting
          const funcArgs = Array.isArray(transaction.functionArguments) 
            ? transaction.functionArguments 
            : [];
          
          // Ensure we have the required arguments
          if (funcArgs.length < 2) {
            throw new Error('Missing required function arguments (need at least subaccount and delegate address)');
          }

          // Prepare arguments - handle Option<u64> for expiration
          const finalArgs = [
            funcArgs[0], // subaccount_address
            funcArgs[1], // account_to_delegate_to
            funcArgs[2] !== undefined && funcArgs[2] !== null ? funcArgs[2] : null, // expiration (null = Option::None)
          ];

          // Prepare payload for Petra - let Petra handle network detection (like Decibel does)
          // Don't build transaction with SDK - just send raw payload and let Petra build it
          const payload = {
            data: {
              function: String(transaction.function),
              typeArguments: Array.isArray(transaction.typeArguments) ? transaction.typeArguments : [],
              functionArguments: finalArgs,
            },
          };

          console.log('[Delegation] Transaction payload for Petra:', JSON.stringify(payload, null, 2));
          console.log('[Delegation] Function:', payload.data.function);
          console.log('[Delegation] Arguments:', finalArgs);

          // Petra will fetch the ABI and build the transaction itself
          const pendingTx = await window.aptos.signAndSubmitTransaction(payload);

          console.log('[Delegation] Transaction submitted:', pendingTx?.hash);

          // Wait for confirmation (Petra's waitForTransaction)
          if (pendingTx?.hash && window.aptos.waitForTransaction) {
            const result = await window.aptos.waitForTransaction(pendingTx.hash);
            console.log('[Delegation] Transaction confirmed:', result);
          } else {
            // If waitForTransaction is not available, just wait a bit
            await new Promise(resolve => setTimeout(resolve, 3000));
          }

          // Refresh delegation status
          await checkDelegationStatus();

          setError(null);
          // Dialog will close automatically when status.isDelegated becomes true
        } catch (signError: any) {
          console.error('[Delegation] Sign error:', signError);
          console.error('[Delegation] Error details:', {
            message: signError.message,
            code: signError.code,
            stack: signError.stack,
            name: signError.name,
          });
          
          // If user rejects the transaction
          if (signError.code === 4001 || signError.message?.includes('reject') || signError.message?.includes('User rejected')) {
            setError('Transaction was rejected. Please try again if you want to enable instant trading.');
          } else if (signError.message?.includes('map') || signError.message?.includes('undefined')) {
            // This error suggests Petra might be on the wrong network or can't find the ABI
            setError(
              'Petra wallet error: Please make sure your Petra wallet is connected to Testnet. ' +
              'The Decibel DEX is on Aptos Testnet. Please switch your Petra wallet to Testnet in the wallet settings.'
            );
          } else {
            setError(signError.message || 'Failed to sign transaction. Please try again.');
          }
        }
      } else {
        // For Photon or other wallets, show instructions
        setError('Please use Petra wallet to delegate trading permissions. Transaction data: ' + JSON.stringify(transaction));
      }
    } catch (err: any) {
      console.error('Error delegating:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delegate trading permissions');
    } finally {
      setIsDelegating(false);
    }
  };

  // Don't show if no wallet, loading, or already delegated
  if (!address || !token || isLoading) {
    return null;
  }

  if (status?.isDelegated) {
    return null; // Already delegated, no need to show dialog
  }

  if (!status?.hasSubaccount) {
    return null; // No subaccount, user needs to set up Decibel first
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Enable Instant Trading</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            Delegate trading permissions to our secure backend wallet to execute trades instantly without wallet confirmations.
            This is a one-time setup and you can revoke it anytime.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Backend Address</div>
            <div className="text-sm font-mono break-all">
              {status?.backendAddress?.slice(0, 6)}...{status?.backendAddress?.slice(-4)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Your Subaccount</div>
            <div className="text-sm font-mono break-all">
              {status?.subaccountAddr?.slice(0, 6)}...{status?.subaccountAddr?.slice(-4)}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isDelegating}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleDelegate}
            disabled={isDelegating}
            className="w-full sm:w-auto"
          >
            {isDelegating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing Transaction...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Delegate Trading Permissions
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

