'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/lib/wallet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, TrendingUp, DollarSign, BarChart3, Target, Award, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';

interface RewardData {
  points: number;
  tier: string;
  nextTier: string;
  pointsToNext: number;
  progress: number;
  stats: {
    totalVolume: number;
    totalTrades: number;
    profitableTrades: number;
    totalPnL: number;
    winRate: number;
  };
}

const TIER_INFO = {
  bronze: { name: 'Bronze', color: '#CD7F32', icon: '🥉', minPoints: 0 },
  silver: { name: 'Silver', color: '#C0C0C0', icon: '🥈', minPoints: 1000 },
  gold: { name: 'Gold', color: '#FFD700', icon: '🥇', minPoints: 5000 },
  platinum: { name: 'Platinum', color: '#E5E4E2', icon: '💎', minPoints: 10000 },
  vip: { name: 'VIP', color: '#8B00FF', icon: '👑', minPoints: 50000 },
};

export default function RewardsPage() {
  const { address } = useWallet();
  const [loading, setLoading] = useState(true);
  const [rewardData, setRewardData] = useState<RewardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      loadRewardData();
    }
  }, [address]);

  const loadRewardData = async () => {
    if (!address) return;

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/rewards/points?user=${address}`);
      setRewardData(response.data);
    } catch (err: any) {
      console.error('[Rewards] Error loading data:', err);
      setError(err.response?.data?.error || 'Failed to load reward data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number, decimals = 0) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const getTierInfo = (tierName: string) => {
    return TIER_INFO[tierName as keyof typeof TIER_INFO] || TIER_INFO.bronze;
  };

  if (!address) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please connect your wallet to view your rewards.</AlertDescription>
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

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!rewardData) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No reward data available. Start trading to earn points!</AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentTier = getTierInfo(rewardData.tier);
  const nextTier = getTierInfo(rewardData.nextTier);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Rewards & Tiers</h1>
        <p className="text-muted-foreground mt-2">Earn points by trading and unlock exclusive tiers</p>
      </div>

      {/* Current Tier & Points */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="border-2" style={{ borderColor: currentTier.color }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Current Tier</CardTitle>
              <span className="text-4xl">{currentTier.icon}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Badge 
                  className="text-lg px-4 py-2" 
                  style={{ backgroundColor: currentTier.color, color: 'white' }}
                >
                  {currentTier.name}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Reward Points</p>
                <p className="text-4xl font-bold" style={{ color: currentTier.color }}>
                  {formatNumber(rewardData.points)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Next Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Badge 
                  className="text-lg px-4 py-2" 
                  style={{ backgroundColor: nextTier.color, color: 'white' }}
                >
                  {nextTier.name} {nextTier.icon}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Points to Next Tier</p>
                <p className="text-3xl font-bold">{formatNumber(rewardData.pointsToNext)}</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{formatNumber(rewardData.progress, 1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <motion.div
                    className="h-3 rounded-full"
                    style={{ backgroundColor: nextTier.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${rewardData.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trading Stats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Trading Statistics</CardTitle>
          <CardDescription>Your trading activity that earns reward points</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Total Volume</p>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(rewardData.stats.totalVolume)}</p>
              <p className="text-xs text-muted-foreground mt-1">1 point per $100</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Total Trades</p>
              </div>
              <p className="text-2xl font-bold">{formatNumber(rewardData.stats.totalTrades)}</p>
              <p className="text-xs text-muted-foreground mt-1">5 points per trade</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <p className="text-sm text-muted-foreground">Profitable Trades</p>
              </div>
              <p className="text-2xl font-bold text-green-500">{formatNumber(rewardData.stats.profitableTrades)}</p>
              <p className="text-xs text-muted-foreground mt-1">10 bonus points each</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Win Rate</p>
              </div>
              <p className="text-2xl font-bold">{formatNumber(rewardData.stats.winRate, 1)}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {rewardData.stats.profitableTrades} of {rewardData.stats.totalTrades}
              </p>
            </div>
          </div>

          {rewardData.stats.totalPnL !== 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Realized PnL</p>
                <p className={`text-xl font-bold ${rewardData.stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {rewardData.stats.totalPnL >= 0 ? '+' : ''}{formatCurrency(rewardData.stats.totalPnL)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {rewardData.stats.totalPnL > 0 ? '1 point per $10 profit' : 'No bonus for losses'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier System */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Tier System</CardTitle>
          <CardDescription>Unlock higher tiers by earning more reward points</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(TIER_INFO).map(([key, tier]) => {
              const isCurrentTier = rewardData.tier === key;
              const isUnlocked = rewardData.points >= tier.minPoints;
              
              return (
                <div
                  key={key}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isCurrentTier
                      ? 'bg-primary/5 border-primary'
                      : isUnlocked
                      ? 'bg-muted/50 border-muted'
                      : 'bg-background border-border opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{tier.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className="text-sm"
                            style={{
                              backgroundColor: isCurrentTier ? tier.color : undefined,
                              color: isCurrentTier ? 'white' : undefined,
                            }}
                          >
                            {tier.name}
                          </Badge>
                          {isCurrentTier && (
                            <Badge variant="outline" className="text-xs">Current</Badge>
                          )}
                          {isUnlocked && !isCurrentTier && (
                            <Badge variant="outline" className="text-xs text-green-600">Unlocked</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatNumber(tier.minPoints)} points required
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {isUnlocked ? (
                        <Award className="h-6 w-6 text-green-500" />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {formatNumber(tier.minPoints - rewardData.points)} points needed
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* How to Earn Points */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-xl">How to Earn Points</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <p className="font-semibold">Trading Volume</p>
              </div>
              <p className="text-sm text-muted-foreground">Earn 1 point for every $100 in trading volume</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <p className="font-semibold">Every Trade</p>
              </div>
              <p className="text-sm text-muted-foreground">Earn 5 points for each trade you execute</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <p className="font-semibold">Profitable Trades</p>
              </div>
              <p className="text-sm text-muted-foreground">Earn 10 bonus points for each profitable trade</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <p className="font-semibold">Profit Bonus</p>
              </div>
              <p className="text-sm text-muted-foreground">Earn 1 point for every $10 in realized profit</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

