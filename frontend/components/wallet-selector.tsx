'use client';

import { useWallet } from '@/lib/wallet';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Copy, LogOut, ExternalLink } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { UserInfoDialog } from '@/components/user-info-dialog';

const PETRA_LOGO_URL = 'https://play-lh.googleusercontent.com/UVZpwZYUjnARMEKWJtbL8N2A7XXH3t6jf0C7rJ7PKdVxzf57mp_DDhXH7iTYS42xSJA=w480-h960-rw';
const PETRA_INSTALL_URL = 'https://play.google.com/store/apps/details?id=com.aptoslabs.petra.wallet';

function truncateAddress(address: string | null): string {
  if (!address) return 'Unknown';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

export function WalletSelector() {
  const { address, isConnected, connect, connectPhoton, disconnect, isLoading, walletType } = useWallet();
  const { login, logout: authLogout } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUserInfoDialogOpen, setIsUserInfoDialogOpen] = useState(false);
  const [pendingWalletAddress, setPendingWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPhotonUser, setIsPhotonUser] = useState(false);
  const [photonResponse, setPhotonResponse] = useState<any>(null);

  const copyAddress = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: 'Success',
        description: 'Copied wallet address to clipboard.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy wallet address.',
      });
    }
  }, [address, toast]);

  const handleWalletConnect = async () => {
    try {
      setIsConnecting(true);
      setIsDialogOpen(false);
      
      // Connect Petra wallet
      await connect();
      
      // Wait a bit for wallet context to update, then get address
      // The connect() function should set the address in the wallet context
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get the current address from wallet context (it should be updated by now)
      // But we need to get it from the Petra wallet directly
      if (!window.aptos) {
        throw new Error('Petra wallet not available');
      }

      const account = await window.aptos.account();
      const walletAddress = account?.address;

      if (!walletAddress) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to get wallet address from Petra.',
        });
        return;
      }

      console.log('Petra wallet address:', walletAddress);

      // Check if user exists in database
      const checkResponse = await api.post('/api/auth/wallet-check', {
        walletAddress: walletAddress,
      });

      if (checkResponse.data.exists) {
        // User exists, login directly
        login(checkResponse.data.token, checkResponse.data.user);
        toast({
          title: 'Success',
          description: 'Wallet connected successfully!',
        });
      } else {
        // New user, show info dialog to collect name/email
        setPendingWalletAddress(walletAddress);
        setIsPhotonUser(false); // This is a Petra wallet, not Photon
        setIsUserInfoDialogOpen(true);
      }
    } catch (error: any) {
      console.error('Petra wallet connection error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.response?.data?.error || error?.message || 'Failed to connect wallet.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleUserInfoSubmit = async (userInfo: {
    email?: string;
    displayName?: string;
    username?: string;
  }) => {
    if (!pendingWalletAddress) return;

    try {
      let response;
      if (isPhotonUser && photonResponse) {
        // User already created via Photon, just update with info
        // We'll update the user via the token we got
        if (photonResponse.token) {
          // Update user info
          await api.patch(
            '/api/auth/me',
            {
              email: userInfo.email,
              displayName: userInfo.displayName,
              username: userInfo.username,
            },
            {
              headers: {
                Authorization: `Bearer ${photonResponse.token}`,
              },
            }
          );
          // Refresh user data
          const userResponse = await api.get('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${photonResponse.token}`,
            },
          });
          login(photonResponse.token, userResponse.data);
        } else {
          // Fallback: create wallet user
          response = await api.post('/api/auth/wallet-login', {
            walletAddress: pendingWalletAddress,
            email: userInfo.email,
            displayName: userInfo.displayName,
            username: userInfo.username,
          });
          login(response.data.token, response.data.user);
        }
      } else {
        // Create wallet user
        response = await api.post('/api/auth/wallet-login', {
          walletAddress: pendingWalletAddress,
          email: userInfo.email,
          displayName: userInfo.displayName,
          username: userInfo.username,
        });
        login(response.data.token, response.data.user);
      }

      setIsUserInfoDialogOpen(false);
      setPendingWalletAddress(null);
      setIsPhotonUser(false);
      setPhotonResponse(null);
      toast({
        title: 'Success',
        description: 'Account created successfully!',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.response?.data?.error || 'Failed to create account.',
      });
      throw error;
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsConnecting(true);
      setIsDialogOpen(false);

      console.log('Starting Photon onboarding...');
      console.log('API Base URL:', api.defaults.baseURL);

      // Create Photon wallet - user info will be collected in dialog
      const response = await api.post('/api/auth/photon-onboard', {
        email: undefined, // Will be collected in user info dialog
      });

      console.log('Photon onboard response:', response.data);
      console.log('Response status:', response.status);

      if (response.data.success) {
        const walletAddress = response.data.wallet_address;
        
        if (!walletAddress) {
          throw new Error('Photon wallet address not received');
        }

        // Connect Photon wallet to the wallet context immediately
        connectPhoton(walletAddress);
        console.log('Photon wallet connected:', walletAddress);

        const user = response.data.user;
        const token = response.data.token;
        
        // Check if user has any info filled in (email, display_name, or username)
        const hasAnyInfo = user && (
          (user.email && user.email.trim() !== '') ||
          (user.display_name && user.display_name.trim() !== '') ||
          (user.username && user.username.trim() !== '')
        );

        if (token && user) {
          // Login the user
          login(token, user);
        }

        // Only show user info dialog if user doesn't have any info (completely new user)
        if (!hasAnyInfo) {
          setPendingWalletAddress(walletAddress);
          setIsPhotonUser(true);
          setPhotonResponse(response.data);
          setIsUserInfoDialogOpen(true);
          console.log('Photon wallet connected, showing user info dialog (new user)');
        } else {
          // User has some info, skip dialog and just show success
          toast({
            title: 'Success',
            description: 'Photon wallet connected successfully!',
          });
          console.log('Photon wallet connected, user has existing info - skipping dialog');
        }
      } else {
        throw new Error('Photon registration was not successful');
      }
    } catch (error: any) {
      console.error('Photon login error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.response?.data?.error || error?.response?.data?.details || 'Failed to create Photon wallet.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    authLogout();
    toast({
      title: 'Disconnected',
      description: 'Wallet disconnected successfully.',
    });
  };

  const isPetraInstalled = typeof window !== 'undefined' && !!window.aptos;

  if (isLoading || isConnecting) {
    return <Button disabled>Loading...</Button>;
  }

  if (isConnected && address) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>{truncateAddress(address)}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={copyAddress} className="gap-2">
              <Copy className="h-4 w-4" />
              Copy address
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleDisconnect} className="gap-2">
              <LogOut className="h-4 w-4" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <UserInfoDialog
          open={isUserInfoDialogOpen}
          onClose={() => {
            setIsUserInfoDialogOpen(false);
            setPendingWalletAddress(null);
          }}
          onSubmit={handleUserInfoSubmit}
          walletAddress={pendingWalletAddress || address || ''}
          initialEmail={photonResponse?.user?.email}
          initialDisplayName={photonResponse?.user?.display_name}
          initialUsername={photonResponse?.user?.username}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            {isPetraInstalled ? 'Connect Petra Wallet' : 'Install Petra Wallet'}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Wallet</DialogTitle>
            <DialogDescription>
              Choose how you want to connect to AlphaFlow
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-3">
            {/* Google Login / Photon */}
            <Button
              variant="outline"
              className="w-full justify-start gap-4 h-auto py-4"
              onClick={handleGoogleLogin}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <div className="flex flex-col items-start flex-1">
                <span className="font-medium">Continue with Google</span>
                <span className="text-xs text-muted-foreground">
                  Create a wallet with Photon (No extension needed)
                </span>
              </div>
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-2">
              <div className="h-px w-full bg-border" />
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="h-px w-full bg-border" />
            </div>

            {/* Petra Wallet */}
            {!isPetraInstalled ? (
              <Button
                variant="outline"
                className="w-full justify-start gap-4 h-auto py-4"
                onClick={() => window.open(PETRA_INSTALL_URL, '_blank')}
              >
                <img
                  src={PETRA_LOGO_URL}
                  alt="Petra Wallet"
                  width={48}
                  height={48}
                  className="rounded-lg"
                />
                <div className="flex flex-col items-start flex-1">
                  <span className="font-medium">Install Petra Wallet</span>
                  <span className="text-xs text-muted-foreground">
                    Get Petra wallet from Google Play Store
                  </span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-4 h-auto py-4"
                onClick={handleWalletConnect}
              >
                <img
                  src={PETRA_LOGO_URL}
                  alt="Petra Wallet"
                  width={48}
                  height={48}
                  className="rounded-lg"
                />
                <div className="flex flex-col items-start flex-1">
                  <span className="font-medium">Connect Petra Wallet</span>
                  <span className="text-xs text-muted-foreground">
                    Connect your existing Petra wallet
                  </span>
                </div>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <UserInfoDialog
        open={isUserInfoDialogOpen}
        onClose={() => {
          setIsUserInfoDialogOpen(false);
          setPendingWalletAddress(null);
          // If user skips and we have token, they're still logged in
          if (photonResponse?.token && photonResponse?.user) {
            login(photonResponse.token, photonResponse.user);
          }
        }}
        onSubmit={handleUserInfoSubmit}
        walletAddress={pendingWalletAddress || address || ''}
        initialEmail={photonResponse?.user?.email}
        initialDisplayName={photonResponse?.user?.display_name}
        initialUsername={photonResponse?.user?.username}
      />
    </>
  );
}
