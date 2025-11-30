'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  walletType: 'petra' | 'photon' | null;
  connect: () => Promise<void>;
  connectPhoton: (walletAddress: string) => void;
  disconnect: () => void;
  isLoading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Petra wallet types are already defined in types/aptos.d.ts

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [walletType, setWalletType] = useState<'petra' | 'photon' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored wallet info (Photon or Petra)
    if (typeof window !== 'undefined') {
      const storedAddress = localStorage.getItem('wallet_address');
      const storedType = localStorage.getItem('wallet_type') as 'petra' | 'photon' | null;
      
      if (storedAddress && storedType) {
        setAddress(storedAddress);
        setWalletType(storedType);
        setIsConnected(true);
        setIsLoading(false);
        return;
      }
    }

    // Check if Petra is installed and connected
    if (typeof window === 'undefined' || !window.aptos) {
      setIsLoading(false);
      return;
    }

    // Check if already connected by trying to get account
    const checkConnection = async () => {
      try {
        const account = await window.aptos!.account();
        if (account?.address) {
          setAddress(account.address);
          setWalletType('petra');
          setIsConnected(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem('wallet_address', account.address);
            localStorage.setItem('wallet_type', 'petra');
          }
        }
      } catch (error) {
        // Not connected
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, []);

  const connect = async () => {
    if (!window.aptos) {
      throw new Error('Petra wallet is not installed. Please install it from https://petra.app');
    }

    try {
      const response = await window.aptos.connect();
      setAddress(response.address);
      setWalletType('petra');
      setIsConnected(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('wallet_address', response.address);
        localStorage.setItem('wallet_type', 'petra');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  };

  const connectPhoton = (walletAddress: string) => {
    setAddress(walletAddress);
    setWalletType('photon');
    setIsConnected(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wallet_address', walletAddress);
      localStorage.setItem('wallet_type', 'photon');
    }
  };

  const disconnect = async () => {
    if (walletType === 'petra' && window.aptos) {
      try {
        await window.aptos.disconnect();
      } catch (error) {
        console.error('Error disconnecting Petra wallet:', error);
      }
    }
    
    setAddress(null);
    setWalletType(null);
    setIsConnected(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wallet_address');
      localStorage.removeItem('wallet_type');
    }
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        walletType,
        connect,
        connectPhoton,
        disconnect,
        isLoading,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

