'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export interface TradeSuggestion {
  market: string;
  side: 'buy' | 'sell';
  size: number;
  orderType: 'market' | 'limit';
  price?: number;
  slPrice?: number;
  tpPrice?: number;
  leverage?: number;
  risk: 'low' | 'medium' | 'high';
  confidence: number;
  riskRewardRatio?: string;
  preferred?: boolean; // Mark the most recommended trade
}

interface TradeSuggestionsContextType {
  tradeSuggestions: TradeSuggestion[];
  setTradeSuggestions: (suggestions: TradeSuggestion[]) => void;
  clearTradeSuggestions: () => void;
}

const TradeSuggestionsContext = createContext<TradeSuggestionsContextType | undefined>(undefined);

export function TradeSuggestionsProvider({ children }: { children: ReactNode }) {
  const [tradeSuggestions, setTradeSuggestions] = useState<TradeSuggestion[]>([]);

  const clearTradeSuggestions = () => {
    setTradeSuggestions([]);
  };

  return (
    <TradeSuggestionsContext.Provider
      value={{
        tradeSuggestions,
        setTradeSuggestions,
        clearTradeSuggestions,
      }}
    >
      {children}
    </TradeSuggestionsContext.Provider>
  );
}

export function useTradeSuggestions() {
  const context = useContext(TradeSuggestionsContext);
  if (context === undefined) {
    throw new Error('useTradeSuggestions must be used within a TradeSuggestionsProvider');
  }
  return context;
}

