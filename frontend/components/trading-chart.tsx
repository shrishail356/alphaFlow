'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Loader2, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTradeSuggestions } from '@/lib/trade-suggestions-context';

interface Market {
  symbol: string;
  name: string;
  tradingViewSymbol: string;
  color: string;
  iconUrl: string;
  coinId: string;
}

const markets: Market[] = [
  {
    symbol: 'BTC-USD',
    name: 'Bitcoin',
    tradingViewSymbol: 'BINANCE:BTCUSDT',
    color: 'from-orange-500 to-yellow-500',
    iconUrl: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    coinId: 'bitcoin',
  },
  {
    symbol: 'ETH-USD',
    name: 'Ethereum',
    tradingViewSymbol: 'BINANCE:ETHUSDT',
    color: 'from-blue-400 to-purple-500',
    iconUrl: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    coinId: 'ethereum',
  },
  {
    symbol: 'APT-USD',
    name: 'Aptos',
    tradingViewSymbol: 'BINANCE:APTUSDT',
    color: 'from-blue-500 to-cyan-500',
    iconUrl: 'https://assets.coingecko.com/coins/images/26455/large/aptos_round.png',
    coinId: 'aptos',
  },
  {
    symbol: 'SOL-USD',
    name: 'Solana',
    tradingViewSymbol: 'BINANCE:SOLUSDT',
    color: 'from-purple-500 to-pink-500',
    iconUrl: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    coinId: 'solana',
  },
  {
    symbol: 'WLFI-USD',
    name: 'Wallfair',
    tradingViewSymbol: 'BINANCE:WLFIUSDT',
    color: 'from-green-500 to-emerald-500',
    iconUrl: 'https://assets.coingecko.com/coins/images/25187/large/wlfi.png',
    coinId: 'wallfair',
  },
  {
    symbol: 'XRP-USD',
    name: 'Ripple',
    tradingViewSymbol: 'BINANCE:XRPUSDT',
    color: 'from-gray-500 to-slate-500',
    iconUrl: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
    coinId: 'ripple',
  },
  {
    symbol: 'HYPE-USD',
    name: 'Hyperliquid',
    tradingViewSymbol: 'BINANCE:HYPEUSDT',
    color: 'from-indigo-500 to-blue-500',
    iconUrl: 'https://assets.coingecko.com/coins/images/30751/large/HYPE.png',
    coinId: 'hyperliquid',
  },
  {
    symbol: 'AAVE-USD',
    name: 'Aave',
    tradingViewSymbol: 'BINANCE:AAVEUSDT',
    color: 'from-red-500 to-pink-500',
    iconUrl: 'https://assets.coingecko.com/coins/images/12645/large/AAVE.png',
    coinId: 'aave',
  },
  {
    symbol: 'LINK-USD',
    name: 'Chainlink',
    tradingViewSymbol: 'BINANCE:LINKUSDT',
    color: 'from-cyan-500 to-blue-500',
    iconUrl: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
    coinId: 'chainlink',
  },
];

// Extend Window interface for TradingView
declare global {
  interface Window {
    TradingView?: {
      widget: new (options: any) => any;
    };
  }
}

export function TradingChart() {
  const { tradeSuggestions } = useTradeSuggestions();
  const [selectedMarket, setSelectedMarket] = useState<Market>(markets[0]);
  const [isChartReady, setIsChartReady] = useState(false);
  const [open, setOpen] = useState(false);
  const containerIdRef = useRef(`tradingview_${Date.now()}`);
  const markersContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsChartReady(false);
    
    // Remove any existing script
    const existingScript = document.getElementById('tradingview-widget-script');
    if (existingScript) {
      existingScript.remove();
    }

    // Create container
    const container = document.getElementById(containerIdRef.current);
    if (!container) return;

    // Clear container
    container.innerHTML = '';

    // Create and inject the TradingView widget script
    const script = document.createElement('script');
    script.id = 'tradingview-widget-script';
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      // Wait for TradingView to be available
      const initWidget = () => {
        if (typeof window !== 'undefined' && window.TradingView && window.TradingView.widget) {
          try {
            new window.TradingView.widget({
              autosize: true,
              symbol: selectedMarket.tradingViewSymbol,
              interval: '15',
              timezone: 'Etc/UTC',
              theme: 'dark',
              style: '1',
              locale: 'en',
              toolbar_bg: '#1a1a1a',
              enable_publishing: false,
              allow_symbol_change: false,
              save_image: false,
              studies: [
                'Volume@tv-basicstudies',
                'RSI@tv-basicstudies',
                'MACD@tv-basicstudies',
              ],
              container_id: containerIdRef.current,
              withdateranges: true,
              range: '1D',
              hide_volume: false,
              support_host: 'https://www.tradingview.com',
            });
            setIsChartReady(true);
          } catch (error) {
            console.error('Error initializing TradingView widget:', error);
            setIsChartReady(true); // Show container even if there's an error
          }
        } else {
          setTimeout(initWidget, 100);
        }
      };
      setTimeout(initWidget, 200);
    };
    script.onerror = () => {
      console.error('Failed to load TradingView script');
      setIsChartReady(true);
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [selectedMarket]);

  // Normalize market name for comparison (handle both BTC-USD and BTC/USD formats)
  const normalizeMarketName = (marketName: string): string => {
    return marketName.replace(/\//g, '-').toUpperCase();
  };

  // Filter trade suggestions for the selected market
  const relevantSuggestions = tradeSuggestions.filter(
    (suggestion) => normalizeMarketName(suggestion.market) === normalizeMarketName(selectedMarket.symbol)
  );

  return (
    <div className="relative h-full w-full flex flex-col bg-background">
      {/* Professional Header with Dropdown */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card/80 backdrop-blur-xl"
      >
        <div className="flex items-center gap-4">
          {/* Market Selector Dropdown */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-[280px] justify-between h-11 bg-background hover:bg-accent border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted flex items-center justify-center shadow-md shrink-0">
                    <Image
                      src={selectedMarket.iconUrl}
                      alt={selectedMarket.name}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-semibold text-sm">{selectedMarket.name}</span>
                    <span className="text-xs text-muted-foreground">{selectedMarket.symbol}</span>
                  </div>
                </div>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search markets..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No market found.</CommandEmpty>
                  <CommandGroup>
                    {markets.map((market) => (
                      <CommandItem
                        key={market.symbol}
                        value={`${market.name} ${market.symbol}`}
                        onSelect={() => {
                          setSelectedMarket(market);
                          setIsChartReady(false);
                          setOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted flex items-center justify-center shadow-md shrink-0">
                            <Image
                              src={market.iconUrl}
                              alt={market.name}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-medium text-sm truncate">{market.name}</span>
                            <span className="text-xs text-muted-foreground truncate">{market.symbol}</span>
                          </div>
                          {selectedMarket.symbol === market.symbol && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 rounded-full bg-primary"
                            />
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Market Info Badge */}
          <Badge variant="secondary" className="px-3 py-1.5 font-medium">
            <TrendingUp className="h-3 w-3 mr-1.5" />
            Live
          </Badge>

          {/* AI Trade Signals Indicator */}
          {relevantSuggestions.length > 0 && (
            <Badge variant="default" className="px-3 py-1.5 font-medium bg-primary/20 text-primary border-primary/30">
              <TrendingUp className="h-3 w-3 mr-1.5" />
              {relevantSuggestions.length} AI Signal{relevantSuggestions.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Chart Controls */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-normal">
            Real-time
          </Badge>
        </div>
      </motion.div>

      {/* TradingView Chart Container with Overlay Markers */}
      <motion.div
        key={selectedMarket.symbol}
        initial={{ opacity: 0 }}
        animate={{ opacity: isChartReady ? 1 : 0.7 }}
        transition={{ duration: 0.4 }}
        className="flex-1 relative overflow-hidden bg-[#0a0a0a]"
      >
        {!isChartReady && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0a0a0a]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Loading chart...</p>
            </motion.div>
          </div>
        )}
        
        {/* TradingView Widget */}
        <div 
          id={containerIdRef.current}
          className="absolute inset-0 w-full h-full"
        />

        {/* AI Trade Markers Overlay - Only show when suggestions exist */}
        <AnimatePresence>
          {relevantSuggestions.length > 0 && isChartReady && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              ref={markersContainerRef}
              className="absolute inset-0 pointer-events-none z-9999"
            >
              {relevantSuggestions.map((suggestion, index) => {
                // Calculate vertical position based on price (approximate)
                // Since we can't access iframe coordinates, we'll position based on suggestion index
                // Buy signals higher up, sell signals lower down
                const verticalPosition = suggestion.side === 'buy' 
                  ? `${20 + (index * 15)}%` // Buy signals start at 20% from top
                  : `${70 - (index * 15)}%`; // Sell signals start at 70% from top
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    className="absolute pointer-events-auto cursor-pointer group"
                    style={{
                      // Position markers on the left side of the chart
                      left: '2%',
                      top: verticalPosition,
                    }}
                    onClick={() => {
                      // Trade execution handled in chat interface
                      // This is just a visual marker
                      console.log('Trade suggestion marker clicked:', suggestion);
                    }}
                  >
                    <div
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm
                        border-2 transition-all duration-200
                        ${suggestion.side === 'buy' 
                          ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30' 
                          : 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                        }
                        ${suggestion.preferred ? 'ring-2 ring-yellow-500/50 ring-offset-2 ring-offset-[#0a0a0a]' : ''}
                        group-hover:scale-110
                      `}
                    >
                      {suggestion.side === 'buy' ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold">
                            {suggestion.side.toUpperCase()}
                          </span>
                          {suggestion.preferred && (
                            <span className="text-[10px] text-yellow-400">⭐</span>
                          )}
                        </div>
                        <span className="text-[10px] opacity-80">
                          {suggestion.size} @ {suggestion.price ? `$${suggestion.price.toFixed(2)}` : 'Market'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Tooltip on hover - positioned on the right side with high z-index */}
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10000">
                      <div className="bg-card/95 backdrop-blur-md border border-border rounded-lg p-3 shadow-2xl min-w-[220px]">
                      <div className="text-xs space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-base">{suggestion.market}</span>
                          {suggestion.preferred && (
                            <Badge className="text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                              ⭐ Preferred
                            </Badge>
                          )}
                        </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Side:</span>
                              <span className={`font-semibold ${suggestion.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                                {suggestion.side.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Size:</span>
                              <span className="font-semibold">{suggestion.size}</span>
                            </div>
                            {suggestion.price && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Price:</span>
                                <span className="font-semibold">${suggestion.price.toFixed(2)}</span>
                              </div>
                            )}
                            {suggestion.orderType && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Type:</span>
                                <span className="font-semibold">{suggestion.orderType.toUpperCase()}</span>
                              </div>
                            )}
                            {suggestion.slPrice && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Stop Loss:</span>
                                <span className="font-semibold text-red-400">${suggestion.slPrice.toFixed(2)}</span>
                              </div>
                            )}
                            {suggestion.tpPrice && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Take Profit:</span>
                                <span className="font-semibold text-green-400">${suggestion.tpPrice.toFixed(2)}</span>
                              </div>
                            )}
                            {suggestion.leverage && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Leverage:</span>
                                <span className="font-semibold">{suggestion.leverage}x</span>
                              </div>
                            )}
                            {suggestion.riskRewardRatio && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">R/R Ratio:</span>
                                <span className="font-semibold">{suggestion.riskRewardRatio}</span>
                              </div>
                            )}
                          </div>
                          <div className="pt-2 border-t border-border mt-2">
                            <Badge 
                              variant={suggestion.risk === 'low' ? 'default' : suggestion.risk === 'medium' ? 'secondary' : 'destructive'}
                              className="text-[10px] w-full justify-center"
                            >
                              {suggestion.risk.toUpperCase()} Risk
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
