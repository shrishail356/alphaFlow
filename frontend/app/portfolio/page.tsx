'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/lib/wallet';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, DollarSign, BarChart3, Package, History, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AccountOverview {
  mainWallet?: {
    perp_equity_balance: number;
    unrealized_pnl: number;
    [key: string]: any;
  } | null;
  primarySubaccount?: {
    perp_equity_balance: number;
    unrealized_pnl: number;
    [key: string]: any;
  } | null;
  primarySubaccountAddress?: string | null;
  combined: {
    perp_equity_balance: number;
    unrealized_pnl: number;
    unrealized_funding_cost: number;
    cross_margin_ratio: number;
    maintenance_margin: number;
    cross_account_leverage_ratio: number | null;
    total_margin: number;
    usdc_cross_withdrawable_balance: number;
    volume?: number | null;
    all_time_return?: number | null;
    pnl_90d?: number | null;
    sharpe_ratio?: number | null;
    max_drawdown?: number | null;
    weekly_win_rate_12w?: number | null;
  };
}

interface Position {
  market: string;
  size: number;
  entry_price: number;
  unrealized_funding: number;
  estimated_liquidation_price: number;
  user_leverage: number;
  is_isolated: boolean;
  is_deleted: boolean;
  tp_limit_price?: number | null;
  sl_limit_price?: number | null;
}

interface Trade {
  market: string;
  action: string;
  size: number;
  price: number;
  is_profit: boolean;
  realized_pnl_amount: number;
  fee_amount: number;
  transaction_unix_ms: number;
  order_id: string;
}

interface Order {
  market: string;
  order_id: string;
  status: string;
  order_type: string;
  is_buy: boolean;
  price?: number | null;
  remaining_size?: number | null;
  orig_size?: number | null;
  unix_ms: number;
}

export default function PortfolioPage() {
  const { address } = useWallet();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [overview, setOverview] = useState<AccountOverview | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);

  useEffect(() => {
    if (address) {
      loadPortfolioData();
    }
  }, [address]);

  const loadPortfolioData = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      // Load all data in parallel - call backend API using api client
      const [overviewRes, positionsRes, tradesRes, openOrdersRes, orderHistoryRes] = await Promise.allSettled([
        api.get(`/api/portfolio/overview?user=${address}`),
        api.get(`/api/portfolio/positions?user=${address}&limit=100`),
        api.get(`/api/portfolio/trades?user=${address}&limit=100`),
        api.get(`/api/portfolio/orders/open?user=${address}&limit=50`),
        api.get(`/api/portfolio/orders/history?user=${address}`),
      ]);

      if (overviewRes.status === 'fulfilled') {
        setOverview(overviewRes.value.data);
      } else {
        console.error('[Portfolio] Error loading overview:', overviewRes.reason);
      }

      if (positionsRes.status === 'fulfilled') {
        const data = positionsRes.value.data;
        setPositions(Array.isArray(data) ? data.filter((p: Position) => !p.is_deleted) : []);
      } else {
        console.error('[Portfolio] Error loading positions:', positionsRes.reason);
      }

      if (tradesRes.status === 'fulfilled') {
        const data = tradesRes.value.data;
        setTrades(Array.isArray(data) ? data : []);
      } else {
        console.error('[Portfolio] Error loading trades:', tradesRes.reason);
      }

      if (openOrdersRes.status === 'fulfilled') {
        const data = openOrdersRes.value.data;
        setOpenOrders(Array.isArray(data) ? data : []);
      } else {
        console.error('[Portfolio] Error loading open orders:', openOrdersRes.reason);
      }

      if (orderHistoryRes.status === 'fulfilled') {
        const data = orderHistoryRes.value.data;
        setOrderHistory(data?.items || []);
      } else {
        console.error('[Portfolio] Error loading order history:', orderHistoryRes.reason);
      }
    } catch (error) {
      console.error('[Portfolio] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number | null | undefined, decimals = 2) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getMarketName = (marketAddress: string) => {
    // Extract market name from address or use a mapping
    // For now, just show shortened address
    return marketAddress.substring(0, 8) + '...' + marketAddress.substring(marketAddress.length - 6);
  };

  if (!address) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please connect your wallet to view your portfolio.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Portfolio</h1>
        <p className="text-muted-foreground mt-2">View your trading performance and history</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="trades">Trade History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {overview ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(overview.combined.perp_equity_balance)}</div>
                    <p className="text-xs text-muted-foreground">
                      {overview.primarySubaccountAddress ? 'Main + Subaccount' : 'Available balance'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unrealized PnL</CardTitle>
                    {overview.combined.unrealized_pnl >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${overview.combined.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(overview.combined.unrealized_pnl)}
                    </div>
                    <p className="text-xs text-muted-foreground">Current positions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Margin</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(overview.combined.total_margin)}</div>
                    <p className="text-xs text-muted-foreground">Used margin</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Leverage</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {overview.combined.cross_account_leverage_ratio 
                        ? `${formatNumber(overview.combined.cross_account_leverage_ratio)}x` 
                        : 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground">Current leverage</p>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Performance (90d)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">PnL (90d):</span>
                        <span className={`font-medium ${(overview.combined.pnl_90d || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCurrency(overview.combined.pnl_90d)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">All-time Return:</span>
                        <span className={`font-medium ${(overview.combined.all_time_return || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCurrency(overview.combined.all_time_return)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Sharpe Ratio:</span>
                        <span className="font-medium">{formatNumber(overview.combined.sharpe_ratio, 3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Max Drawdown:</span>
                        <span className="font-medium text-red-500">{formatCurrency(overview.combined.max_drawdown)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Trading Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Volume:</span>
                        <span className="font-medium">{formatCurrency(overview.combined.volume)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Win Rate (12w):</span>
                        <span className="font-medium">{formatNumber((overview.combined.weekly_win_rate_12w || 0) * 100, 1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Funding Cost:</span>
                        <span className={`font-medium ${overview.combined.unrealized_funding_cost >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCurrency(overview.combined.unrealized_funding_cost)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Account Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Withdrawable:</span>
                        <span className="font-medium">{formatCurrency(overview.combined.usdc_cross_withdrawable_balance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Margin Ratio:</span>
                        <span className="font-medium">{formatNumber((overview.combined.cross_margin_ratio || 0) * 100, 2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Maintenance Margin:</span>
                        <span className="font-medium">{formatCurrency(overview.combined.maintenance_margin)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No account data available. Start trading to see your portfolio.</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          {positions.length > 0 ? (
            <div className="space-y-4">
              {positions.map((position, idx) => {
                const isLong = position.size > 0;
                const isShort = position.size < 0;
                const positionColor = isLong ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                const bgColor = isLong ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
                
                return (
                  <Card key={idx} className={`${bgColor} border-2`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{getMarketName(position.market)}</CardTitle>
                        <div className="flex items-center gap-2">
                          {isLong ? (
                            <Badge className="bg-green-500 text-white hover:bg-green-600">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              LONG
                            </Badge>
                          ) : isShort ? (
                            <Badge className="bg-red-500 text-white hover:bg-red-600">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              SHORT
                            </Badge>
                          ) : (
                            <Badge variant="secondary">CLOSED</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Size</p>
                          <p className={`font-semibold text-lg ${positionColor}`}>
                            {isLong ? '+' : isShort ? '-' : ''}{formatNumber(Math.abs(position.size))}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Entry Price</p>
                          <p className="font-semibold">{formatCurrency(position.entry_price)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Leverage</p>
                          <p className="font-semibold">{position.user_leverage}x</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Liquidation</p>
                          <p className="font-semibold text-red-500">{formatCurrency(position.estimated_liquidation_price)}</p>
                        </div>
                      </div>
                      
                      {/* Unrealized PnL */}
                      {position.unrealized_funding !== undefined && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Unrealized Funding</p>
                            <p className={`font-semibold ${position.unrealized_funding >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {position.unrealized_funding >= 0 ? '+' : ''}{formatCurrency(position.unrealized_funding)}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* TP/SL */}
                      {(position.tp_limit_price || position.sl_limit_price) && (
                        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                          {position.tp_limit_price && (
                            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                              <p className="text-sm text-muted-foreground mb-1">Take Profit</p>
                              <p className="font-semibold text-green-600 dark:text-green-400 text-lg">
                                {formatCurrency(position.tp_limit_price)}
                              </p>
                            </div>
                          )}
                          {position.sl_limit_price && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                              <p className="text-sm text-muted-foreground mb-1">Stop Loss</p>
                              <p className="font-semibold text-red-600 dark:text-red-400 text-lg">
                                {formatCurrency(position.sl_limit_price)}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No open positions. Start trading to see your positions here.</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">Open Orders ({openOrders.length})</h3>
              {openOrders.length > 0 ? (
                <div className="space-y-2">
                  {openOrders.map((order, idx) => {
                    const bgColor = order.is_buy ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
                    
                    return (
                      <Card key={idx} className={`${bgColor} border-2`}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {order.is_buy ? (
                                <Badge className="bg-green-500 text-white hover:bg-green-600">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  BUY
                                </Badge>
                              ) : (
                                <Badge className="bg-red-500 text-white hover:bg-red-600">
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  SELL
                                </Badge>
                              )}
                              <div>
                                <p className="font-semibold">{getMarketName(order.market)}</p>
                                <p className="text-sm text-muted-foreground">{order.order_type} • {order.status}</p>
                                {order.order_id && (
                                  <p className="text-xs text-muted-foreground">ID: {order.order_id.substring(0, 8)}...</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {order.price && <p className="font-semibold text-lg">{formatCurrency(order.price)}</p>}
                              {order.remaining_size && (
                                <p className="text-sm text-muted-foreground">Remaining: {formatNumber(order.remaining_size)}</p>
                              )}
                              {order.orig_size && order.remaining_size && (
                                <p className="text-xs text-muted-foreground">
                                  Filled: {formatNumber((order.orig_size - order.remaining_size) / order.orig_size * 100)}%
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>No open orders.</AlertDescription>
                </Alert>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Order History ({orderHistory.length})</h3>
              {orderHistory.length > 0 ? (
                <div className="space-y-2">
                  {orderHistory.slice(0, 20).map((order, idx) => {
                    const isCompleted = order.status === 'Filled' || order.status === 'filled';
                    const isCancelled = order.status === 'Cancelled' || order.status === 'cancelled';
                    const bgColor = order.is_buy 
                      ? (isCompleted ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800')
                      : (isCompleted ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800');
                    
                    return (
                      <Card key={idx} className={`${bgColor} border`}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {order.is_buy ? (
                                <Badge className={isCompleted ? "bg-green-500 text-white" : "bg-gray-500 text-white"}>
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  BUY
                                </Badge>
                              ) : (
                                <Badge className={isCompleted ? "bg-red-500 text-white" : "bg-gray-500 text-white"}>
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  SELL
                                </Badge>
                              )}
                              <div>
                                <p className="font-semibold">{getMarketName(order.market)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {order.order_type} • 
                                  <span className={isCompleted ? ' text-green-600 dark:text-green-400' : isCancelled ? ' text-red-600 dark:text-red-400' : ''}>
                                    {' '}{order.status}
                                  </span>
                                </p>
                                <p className="text-xs text-muted-foreground">{formatDate(order.unix_ms)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              {order.price && <p className="font-semibold">{formatCurrency(order.price)}</p>}
                              {order.orig_size && <p className="text-sm text-muted-foreground">Size: {formatNumber(order.orig_size)}</p>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>No order history available.</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trades" className="space-y-4">
          {trades.length > 0 ? (
            <div className="space-y-2">
              {trades.map((trade, idx) => {
                const isBuy = trade.action === 'buy' || trade.action === 'Buy';
                const isSell = trade.action === 'sell' || trade.action === 'Sell';
                const bgColor = isBuy ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
                
                return (
                  <Card key={idx} className={`${bgColor} border-2`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {isBuy ? (
                            <Badge className="bg-green-500 text-white hover:bg-green-600">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              BUY
                            </Badge>
                          ) : isSell ? (
                            <Badge className="bg-red-500 text-white hover:bg-red-600">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              SELL
                            </Badge>
                          ) : (
                            <Badge variant="secondary">{trade.action.toUpperCase()}</Badge>
                          )}
                          <div>
                            <p className="font-semibold">{getMarketName(trade.market)}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(trade.transaction_unix_ms)}</p>
                            {trade.order_id && (
                              <p className="text-xs text-muted-foreground">Order: {trade.order_id.substring(0, 8)}...</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">{formatCurrency(trade.price)}</p>
                          <p className="text-sm text-muted-foreground">Size: {formatNumber(trade.size)}</p>
                          <div className="mt-2 p-2 rounded-lg bg-background/50">
                            <p className="text-xs text-muted-foreground mb-1">Realized PnL</p>
                            <p className={`text-lg font-bold ${trade.is_profit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {trade.is_profit ? '+' : ''}{formatCurrency(trade.realized_pnl_amount)}
                            </p>
                          </div>
                          {trade.fee_amount !== undefined && trade.fee_amount > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">Fee: {formatCurrency(trade.fee_amount)}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No trade history. Start trading to see your trades here.</AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

