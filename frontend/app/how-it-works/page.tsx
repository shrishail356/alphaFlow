'use client';

import { motion } from 'framer-motion';
import { 
  Shield, 
  Brain, 
  Zap, 
  Trophy,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function HowItWorksPage() {
  const steps = [
    {
      number: '01',
      title: 'Connect Your Wallet',
      description: 'Securely connect your Petra wallet or create an embedded wallet instantly. No KYC required.',
      icon: Shield,
      details: [
        'Connect with Petra wallet extension',
        'Or create an embedded wallet with one click',
        'Your funds stay in your control',
        '100% non-custodial',
      ],
      color: 'from-blue-500 to-cyan-500',
    },
    {
      number: '02',
      title: 'Chat with AI Assistant',
      description: 'Ask questions about the market, get trade suggestions, and receive real-time analysis powered by advanced AI.',
      icon: Brain,
      details: [
        'Natural language conversation',
        'Market sentiment analysis',
        'Real-time news integration',
        'Personalized trade recommendations',
      ],
      color: 'from-purple-500 to-pink-500',
    },
    {
      number: '03',
      title: 'Review & Execute Trades',
      description: 'Review AI recommendations with detailed reasoning, then execute trades with a single click on Decibel DEX.',
      icon: Zap,
      details: [
        'See AI reasoning for each suggestion',
        'Review risk levels and confidence scores',
        'One-click trade execution',
        'Sub-second transaction finality',
      ],
      color: 'from-yellow-500 to-orange-500',
    },
    {
      number: '04',
      title: 'Track & Earn Rewards',
      description: 'Monitor your portfolio performance in real-time and earn reward points for every trade you make.',
      icon: Trophy,
      details: [
        'Real-time portfolio tracking',
        'P&L and performance analytics',
        'Earn points for trading activity',
        'Unlock tiers and achievements',
      ],
      color: 'from-green-500 to-emerald-500',
    },
  ];

  const features = [
    {
      icon: MessageSquare,
      title: 'AI Chat Interface',
      description: 'Chat naturally with our AI assistant to get market insights and trading suggestions.',
    },
    {
      icon: TrendingUp,
      title: 'Market Analysis',
      description: 'AI analyzes candlestick data, order books, trades, and news sentiment.',
    },
    {
      icon: BarChart3,
      title: 'Portfolio Management',
      description: 'Track all your positions, P&L, and trading history in one place.',
    },
    {
      icon: Sparkles,
      title: 'Reward System',
      description: 'Earn points based on trading volume, profitable trades, and activity.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-muted mb-6"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">How It Works</span>
            </motion.div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Simple. Fast. Powerful.
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Get started with AI-powered trading on Aptos in just 4 simple steps
            </p>
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/trading">
                Start Trading <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="space-y-32">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isEven = index % 2 === 0;
              
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12`}
                >
                  {/* Content */}
                  <div className="flex-1">
                    <motion.div
                      initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6 }}
                    >
                      <div className="inline-flex items-center gap-3 mb-4">
                        <span className="text-6xl font-bold text-primary/20">{step.number}</span>
                        <h2 className="text-4xl font-bold">{step.title}</h2>
                      </div>
                      <p className="text-xl text-muted-foreground mb-6">
                        {step.description}
                      </p>
                      <ul className="space-y-3">
                        {step.details.map((detail, idx) => (
                          <motion.li
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: idx * 0.1 }}
                            className="flex items-start gap-3"
                          >
                            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{detail}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  </div>

                  {/* Icon/Visual */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="flex-1 flex items-center justify-center"
                  >
                    <div className={`relative w-64 h-64 rounded-3xl bg-gradient-to-br ${step.color} p-8 shadow-2xl`}>
                      <div className="absolute inset-0 rounded-3xl bg-black/20 backdrop-blur-sm" />
                      <Icon className="relative h-full w-full text-white" />
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Key Features
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need for successful trading
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  <Card className="h-full border-2 hover:border-primary/50 transition-all">
                    <CardHeader>
                      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl text-center rounded-3xl border-2 bg-gradient-to-br from-primary/10 via-background to-primary/5 p-12 backdrop-blur-sm"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Connect your wallet and start trading with AI assistance today
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="text-lg px-8">
                <Link href="/trading">
                  Start Trading <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

