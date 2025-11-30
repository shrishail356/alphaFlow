'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@/lib/wallet';
import { useRouter } from 'next/navigation';
import { TradingChart } from '@/components/trading-chart';
import { AIChatInterface } from '@/components/ai-chat-interface';
import { Loader2 } from 'lucide-react';
import { TradeSuggestionsProvider } from '@/lib/trade-suggestions-context';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

export default function TradingPage() {
  const { isConnected, isLoading } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isConnected) {
      router.push('/');
    }
  }, [isConnected, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">Loading trading interface...</p>
        </motion.div>
      </div>
    );
  }

  if (!isConnected) {
    return null;
  }

  return (
    <TradeSuggestionsProvider>
      <div className="h-[calc(100vh-4rem)] overflow-hidden bg-background flex flex-col">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex-1 overflow-hidden"
        >
          <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Side - Trading Chart (Resizable) */}
          <ResizablePanel
            defaultSize={55}
            minSize={35}
            maxSize={75}
            className="relative bg-background overflow-hidden"
          >
            <motion.div
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full w-full"
            >
              <TradingChart />
            </motion.div>
          </ResizablePanel>

          {/* Resizable Handle - Draggable divider */}
          <ResizableHandle 
            withHandle 
            className="bg-border/30 hover:bg-border/60 active:bg-primary/50 transition-all duration-200 w-1 group"
          />

          {/* Right Side - AI Chat Interface (Resizable, Increased Default Size) */}
          <ResizablePanel
            defaultSize={45}
            minSize={25}
            maxSize={65}
            className="relative bg-background overflow-hidden"
          >
            <motion.div
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
              className="h-full w-full"
            >
              <AIChatInterface />
            </motion.div>
          </ResizablePanel>
          </ResizablePanelGroup>
        </motion.div>
      </div>
    </TradeSuggestionsProvider>
  );
}
