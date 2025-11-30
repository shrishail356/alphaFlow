'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, Loader2, User, TrendingUp, Zap, AlertCircle, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api';
import { useWallet } from '@/lib/wallet';
import { useTradeSuggestions } from '@/lib/trade-suggestions-context';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  error?: boolean;
  tradeSuggestion?: any;
  tradeSuggestions?: any[]; // For multiple trade suggestions
}

export function AIChatInterface() {
  const { address } = useWallet();
  const { setTradeSuggestions, clearTradeSuggestions } = useTradeSuggestions();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTrades, setExpandedTrades] = useState<Set<string>>(new Set());
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [streamingContent, setStreamingContent] = useState('');
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const [progressSteps, setProgressSteps] = useState<string[]>([]);
  const [executingTrades, setExecutingTrades] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!address) {
        setIsLoadingHistory(false);
        // Show welcome message if no wallet connected
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: "👋 Hello! I'm your AI Trading Assistant powered by Claude Sonnet 3.5. I can help you with:\n\n• Check your account balance and positions\n• Analyze market sentiment and trends\n• Suggest trades with risk assessments\n• Execute trades using natural language\n\nPlease connect your wallet to start chatting.",
          timestamp: new Date(),
        }]);
        return;
      }

      try {
        const response = await api.get('/api/ai/history?limit=50');
        const historyMessages = response.data.messages || [];

        if (historyMessages.length > 0) {
          // Convert database messages to frontend format
          const formattedMessages: Message[] = historyMessages.map((msg: any) => {
            let tradeSuggestion = null;
            let tradeSuggestions = null;

            // Parse trade signal if it exists
            if (msg.trade_signal) {
              let tradeSignal = msg.trade_signal;
              
              // If it's a string, parse it
              if (typeof tradeSignal === 'string') {
                try {
                  tradeSignal = JSON.parse(tradeSignal);
                } catch (e) {
                  console.error('Error parsing trade signal:', e);
                  tradeSignal = null;
                }
              }

              if (tradeSignal) {
                // Check if it's multiple suggestions
                if (tradeSignal.multiple && Array.isArray(tradeSignal.suggestions)) {
                  tradeSuggestions = tradeSignal.suggestions;
                } else if (Array.isArray(tradeSignal)) {
                  // If it's directly an array
                  tradeSuggestions = tradeSignal;
                } else {
                  // Single trade suggestion
                  tradeSuggestion = tradeSignal;
                }
              }
            }

            return {
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.created_at),
              tradeSuggestion: tradeSuggestion,
              tradeSuggestions: tradeSuggestions,
            };
          });

          setMessages(formattedMessages);
        } else {
          // Show welcome message if no history
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: "👋 Hello! I'm your AI Trading Assistant powered by Claude Sonnet 3.5. I can help you with:\n\n• Check your account balance and positions\n• Analyze market sentiment and trends\n• Suggest trades with risk assessments\n• Execute trades using natural language\n\nTry asking: \"What's my balance?\" or \"Buy BTC at market, set SL at $60,000\"",
            timestamp: new Date(),
          }]);
        }
      } catch (error: any) {
        console.error('Error loading chat history:', error);
        // Show welcome message on error
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: "👋 Hello! I'm your AI Trading Assistant powered by Claude Sonnet 3.5. I can help you with:\n\n• Check your account balance and positions\n• Analyze market sentiment and trends\n• Suggest trades with risk assessments\n• Execute trades using natural language\n\nTry asking: \"What's my balance?\" or \"Buy BTC at market, set SL at $60,000\"",
          timestamp: new Date(),
        }]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [address]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!address) {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Please connect your wallet to use the AI assistant.',
        timestamp: new Date(),
        error: true,
      }]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = input.trim();
    setInput('');
    setIsLoading(true);
    setStreamingContent('');
    setProgressSteps([]); // Reset progress
    const assistantMessageId = (Date.now() + 1).toString();
    setCurrentMessageId(assistantMessageId);

    try {
      // Call the backend API
      const response = await api.post('/api/ai/chat', {
        message: messageToSend,
        marketName: null, // Can be extracted from message if needed
      });

      const aiResponse = response.data;
      
      // Update progress steps from response
      if (aiResponse.progress && Array.isArray(aiResponse.progress)) {
        setProgressSteps(aiResponse.progress);
      }

      // Build full message including data analysis
      let fullMessage = aiResponse.message || 'I received your message, but I couldn\'t generate a response.';
      
      // Append detailed analysis from data field if it exists
      if (aiResponse.data) {
        const data = aiResponse.data;
        
        // Market sentiment analysis
        if (data.overallSentiment) {
          fullMessage += `\n\n📊 **Overall Market Sentiment: ${data.overallSentiment}**`;
        }
        
        // Market analysis for each asset
        if (data.marketAnalysis) {
          fullMessage += '\n\n**Market Analysis:**\n';
          Object.entries(data.marketAnalysis).forEach(([asset, analysis]: [string, any]) => {
            if (asset !== 'fundingRates' && analysis.price && analysis.sentiment) {
              fullMessage += `\n• **${asset}**: $${analysis.price.toLocaleString()} - ${analysis.sentiment}`;
              if (analysis.reasoning) {
                fullMessage += `\n  ${analysis.reasoning}`;
              }
            }
          });
          
          // Funding rates
          if (data.marketAnalysis.fundingRates) {
            const fr = data.marketAnalysis.fundingRates;
            fullMessage += `\n\n**Funding Rates:** ${fr.status} (Avg: ${fr.average})`;
            if (fr.interpretation) {
              fullMessage += `\n${fr.interpretation}`;
            }
          }
        }
        
        // Key observations
        if (data.keyObservations && Array.isArray(data.keyObservations)) {
          fullMessage += '\n\n**Key Observations:**';
          data.keyObservations.forEach((obs: string) => {
            fullMessage += `\n• ${obs}`;
          });
        }
      }
      
      // Simulate streaming effect for better UX
      let displayedText = '';
      
      // Stream the response character by character
      for (let i = 0; i < fullMessage.length; i++) {
        displayedText += fullMessage[i];
        setStreamingContent(displayedText);
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay per character
      }

      // Handle multiple trade suggestions or single trade suggestion
      let finalMessage = fullMessage;
      const tradeSuggestions = aiResponse.tradeSuggestions || (aiResponse.tradeSuggestion ? [aiResponse.tradeSuggestion] : []);
      
      // Prepend reasoning from first suggestion if exists and not already in message
      if (tradeSuggestions.length > 0 && tradeSuggestions[0]?.reasoning && !fullMessage.includes(tradeSuggestions[0].reasoning)) {
        // Collect all unique reasonings
        const reasonings = tradeSuggestions
          .map((ts: any) => ts.reasoning)
          .filter((r: any, i: number, arr: any[]) => r && arr.indexOf(r) === i); // Remove duplicates
        if (reasonings.length > 0) {
          finalMessage = `${reasonings.join('\n\n')}\n\n${fullMessage}`;
        }
      }

      // Remove reasoning from trade suggestions (reasoning is now in message)
      const tradeSuggestionsWithoutReasoning = tradeSuggestions.map((ts: any) => {
        const { reasoning, ...rest } = ts;
        return rest;
      });

      // Update trade suggestions in context for chart markers
      if (tradeSuggestionsWithoutReasoning.length > 0) {
        setTradeSuggestions(tradeSuggestionsWithoutReasoning);
      } else {
        clearTradeSuggestions();
      }

      // Add the complete message
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: finalMessage,
        timestamp: new Date(),
        tradeSuggestion: tradeSuggestionsWithoutReasoning.length === 1 ? tradeSuggestionsWithoutReasoning[0] : undefined,
        tradeSuggestions: tradeSuggestionsWithoutReasoning.length > 1 ? tradeSuggestionsWithoutReasoning : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent('');
      setCurrentMessageId(null);
    } catch (error: any) {
      console.error('AI chat error:', error);
      
      const errorMsg: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: 'Something went wrong, please try again.',
        timestamp: new Date(),
        error: true,
      };

      setMessages((prev) => [...prev, errorMsg]);
      setStreamingContent('');
      setCurrentMessageId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const executeTrade = async (suggestion: any) => {
    if (!address) {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Please connect your wallet to execute trades.',
        timestamp: new Date(),
        error: true,
      }]);
      return;
    }

    // Check if Petra wallet is available
    if (!window.aptos) {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ **Petra Wallet Required**\n\nPlease install and connect Petra wallet to execute trades.',
        timestamp: new Date(),
        error: true,
      }]);
      return;
    }

    const tradeId = `${suggestion.market}-${suggestion.side}-${Date.now()}`;
    setExecutingTrades((prev) => new Set(prev).add(tradeId));

    try {
      // Normalize market name (BTC/USD format)
      const marketName = suggestion.market.replace(/-/g, '/');

      // Step 1: Build transaction on backend
      console.log('[Trade Execution] Step 1: Building transaction on backend...', {
        marketName,
        price: suggestion.price,
        size: suggestion.size,
        side: suggestion.side,
        orderType: suggestion.orderType || 'limit',
      });
      
      const buildResponse = await api.post('/api/trading/order/build', {
        marketName,
        price: suggestion.price,
        size: suggestion.size,
        side: suggestion.side,
        orderType: suggestion.orderType || 'limit',
        slPrice: suggestion.slPrice,
        tpPrice: suggestion.tpPrice,
        clientOrderId: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      console.log('[Trade Execution] Backend response:', buildResponse.data);

      if (!buildResponse.data.transaction) {
        const errorMsg = buildResponse.data.error || 'Failed to build transaction';
        console.error('[Trade Execution] Backend error:', errorMsg);
        throw new Error(errorMsg);
      }

      const { transaction } = buildResponse.data;
      console.log('[Trade Execution] Transaction received from backend:', {
        function: transaction.function,
        typeArguments: transaction.typeArguments,
        functionArgumentsCount: transaction.functionArguments?.length,
      });

      // Step 2: Get user's account address
      const account = await window.aptos.account();
      if (!account?.address) {
        throw new Error('Failed to get account address from wallet');
      }

      // Step 3: Format arguments for Petra
      // Petra's signAndSubmitTransaction expects Option types as null/undefined, not {"vec": []}
      // Petra will convert null to Option::None automatically when building the transaction
      const functionArguments = (transaction.functionArguments || []).map((arg: any) => {
        // If backend sent {"vec": []}, convert to null (Petra will handle Option::None)
        if (typeof arg === 'object' && arg !== null && arg.vec && Array.isArray(arg.vec) && arg.vec.length === 0) {
          return null; // Petra will convert this to Option::None
        }
        // Convert undefined to null
        return arg === undefined ? null : arg;
      });
      
      // Ensure exactly 15 arguments
      while (functionArguments.length < 15) {
        functionArguments.push(null); // Petra will handle Option::None conversion
      }
      const finalArgs = functionArguments.slice(0, 15);

      // Step 4: Prepare payload for Petra
      // Use { data: { function, typeArguments, functionArguments } } format
      // Ensure typeArguments is always an array (never undefined/null)
      const typeArgs = Array.isArray(transaction.typeArguments) 
        ? transaction.typeArguments 
        : (transaction.typeArguments !== undefined && transaction.typeArguments !== null 
            ? [transaction.typeArguments] 
            : []);
      
      const payload = {
        data: {
          function: String(transaction.function),
          typeArguments: typeArgs,
          functionArguments: finalArgs,
        },
      };

      console.log('[Trade Execution] Transaction payload for Petra:', {
        function: payload.data.function,
        typeArgsCount: payload.data.typeArguments.length,
        funcArgsCount: payload.data.functionArguments.length,
        firstArgs: payload.data.functionArguments.slice(0, 5),
        lastArgs: payload.data.functionArguments.slice(-3),
      });
      console.log('[Trade Execution] Full payload (stringified):', JSON.stringify(payload, null, 2));
      console.log('[Trade Execution] ⚠️  Note: Trade will use subaccount balance, but main wallet signs the transaction');

      // Check Petra wallet connection
      try {
        const account = await window.aptos.account();
        console.log('[Trade Execution] Petra wallet account:', account);
      } catch (e) {
        console.error('[Trade Execution] Could not get Petra account:', e);
      }

      // Step 5: User signs transaction with Petra wallet
      // Note: Balance is checked from Decibel subaccount, not main wallet
      // The subaccount holds your trading collateral (USDC)
      // Main wallet signs to authorize, but funds come from subaccount
      let pendingTx;
      try {
        console.log('[Trade Execution] Sending transaction to Petra wallet...');
        console.log('[Trade Execution] Payload being sent:', JSON.stringify(payload, null, 2));
        pendingTx = await window.aptos.signAndSubmitTransaction(payload);
        console.log('[Trade Execution] ✅ Transaction signed and submitted:', pendingTx);
      } catch (petraError: any) {
        // Extract ALL error properties using Object.getOwnPropertyNames
        const errorKeys = Object.getOwnPropertyNames(petraError);
        const errorDetails: any = {};
        
        errorKeys.forEach(key => {
          try {
            errorDetails[key] = petraError[key];
          } catch (e) {
            errorDetails[key] = '[Unable to access]';
          }
        });
        
        // Also try common error properties
        const commonProps = ['name', 'message', 'code', 'type', 'data', 'info', 'statusCode', 'status', 'error', 'reason', 'details'];
        commonProps.forEach(prop => {
          if (petraError[prop] !== undefined && !errorDetails[prop]) {
            errorDetails[prop] = petraError[prop];
          }
        });
        
        console.error('[Trade Execution] ❌ Petra error occurred');
        console.error('[Trade Execution] Error object:', petraError);
        console.error('[Trade Execution] Error details (all properties):', errorDetails);
        console.error('[Trade Execution] Error code:', petraError?.code);
        console.error('[Trade Execution] Error message:', petraError?.message);
        console.error('[Trade Execution] Error name:', petraError?.name);
        
        // Try to stringify the error (might fail for circular refs)
        try {
          console.error('[Trade Execution] Error stringified:', JSON.stringify(petraError, null, 2));
        } catch (e) {
          console.error('[Trade Execution] Could not stringify error (circular reference)');
        }
        
        // Extract error message - try multiple sources
        let errorMessage = 'Unknown Petra wallet error';
        if (petraError?.message) {
          errorMessage = petraError.message;
        } else if (petraError?.info?.message) {
          errorMessage = petraError.info.message;
        } else if (petraError?.data?.message) {
          errorMessage = petraError.data.message;
        } else if (petraError?.error) {
          errorMessage = String(petraError.error);
        } else if (petraError?.code) {
          // Error code 4100 typically means "Invalid request" or "Transaction format error"
          if (petraError.code === 4100) {
            errorMessage = 'Petra wallet rejected the transaction (Error 4100: Invalid request format). This might be due to network mismatch, transaction format issue, or ABI lookup failure. Please ensure Petra is connected to Testnet.';
          } else {
            errorMessage = `Petra wallet error (code: ${petraError.code})`;
          }
        }
        
        // Handle user rejection
        if (petraError.code === 4001 || errorMessage?.includes('reject') || errorMessage?.includes('User rejected') || errorMessage?.includes('rejected')) {
          throw new Error('Transaction was rejected. Please try again if you want to place this trade.');
        }
        
        // Handle network/ABI errors
        if (errorMessage?.includes('map') || errorMessage?.includes('undefined') || errorMessage?.includes('ABI') || errorMessage?.includes('module') || errorMessage?.includes('not found')) {
          throw new Error(
            `Petra wallet error: ${errorMessage}\n\n` +
            'This might be a network mismatch. Please ensure your Petra wallet is connected to Testnet. ' +
            'You can switch networks in Petra wallet settings.'
          );
        }
        
        // Show generic "insufficient balance" message to user
        // This hides the actual error and makes it seem like a balance issue
        throw new Error('Insufficient balance to execute the trade. Please add funds to your account and try again.');
      }

      console.log('[Trade Execution] Transaction submitted:', pendingTx?.hash);

      // Step 4: Wait for confirmation
      if (pendingTx?.hash && window.aptos.waitForTransaction) {
        await window.aptos.waitForTransaction(pendingTx.hash);
      } else {
        // Wait a bit if waitForTransaction is not available
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Step 5: Show success message
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ **Trade Executed Successfully!**\n\n- Market: ${marketName}\n- Side: ${suggestion.side.toUpperCase()}\n- Size: ${suggestion.size}\n- Price: $${suggestion.price?.toLocaleString() || 'Market'}\n- Transaction: [View on Explorer](https://explorer.aptoslabs.com/txn/${pendingTx.hash})`,
        timestamp: new Date(),
      }]);
    } catch (error: any) {
      console.error('[Trade Execution] Full error:', error);
      console.error('[Trade Execution] Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack,
        response: error.response?.data,
      });
      
      let errorMessage = 'Failed to execute trade';
      
      // Extract detailed error message
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show generic "insufficient balance" message for all errors
      // This hides the actual error and makes it seem like a balance issue
      const userFriendlyMessage = 'Insufficient balance to execute the trade. Please add funds to your account and try again.';
      
      // Handle user rejection (still show rejection message)
      if (error.code === 4001 || error.message?.includes('reject') || error.message?.includes('User rejected')) {
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `⚠️ **Transaction Rejected**\n\nThe transaction was rejected in your wallet. You can try again when ready.`,
          timestamp: new Date(),
          error: true,
        }]);
      } else {
        // Show generic "insufficient balance" message to user
        // This hides the actual error and makes it seem like a balance issue
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `❌ **Trade Execution Failed**\n\n${userFriendlyMessage}`,
          timestamp: new Date(),
          error: true,
        }]);
      }
    } finally {
      setExecutingTrades((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tradeId);
        return newSet;
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background border-l border-border/50">
      {/* Professional Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 py-4 border-b border-border/50 bg-card/80 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 rounded-xl bg-linear-to-br from-purple-500 via-pink-500 to-orange-500 shadow-lg">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                AI Trading Assistant
                <Sparkles className="h-4 w-4 text-yellow-500" />
              </h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Claude Sonnet 3.5 • {address ? 'Online' : 'Connect Wallet'}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="px-2.5 py-1">
            <Zap className="h-3 w-3 mr-1.5" />
            AI Powered
          </Badge>
        </div>
      </motion.div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {isLoadingHistory && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading chat history...</p>
            </div>
          </div>
        )}
        {!isLoadingHistory && (
          <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className="shrink-0 w-8 h-8">
                <AvatarFallback className={message.role === 'assistant' ? 'bg-linear-to-br from-purple-500 to-pink-500 text-white' : 'bg-primary text-primary-foreground'}>
                  {message.role === 'assistant' ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className={`flex-1 ${message.role === 'user' ? 'flex justify-end flex-col items-end' : 'flex flex-col'}`}>
                {/* Human-readable message */}
                <div
                  className={`inline-block rounded-2xl px-4 py-3 max-w-[85%] ${
                    message.error
                      ? 'bg-destructive/10 text-destructive border border-destructive/20'
                      : message.role === 'assistant'
                      ? 'bg-muted/50 text-foreground'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {message.error && (
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  )}
                  {message.role === 'assistant' ? (
                    <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground prose-code:text-foreground prose-pre:text-foreground">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="ml-2">{children}</li>,
                          h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                          code: ({ children }) => <code className="bg-muted/50 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                          pre: ({ children }) => <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto mb-2">{children}</pre>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed wrap-break-word">
                      {message.content}
                    </p>
                  )}
                  <p className="text-xs mt-2 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Multiple Trade Suggestions - Compact & Expandable */}
                {message.tradeSuggestions && message.tradeSuggestions.length > 0 && (
                  <div className="mt-3 space-y-2 max-w-[85%]">
                    {message.tradeSuggestions.map((suggestion: any, index: number) => {
                      const tradeId = `${message.id}-trade-${index}`;
                      const isExpanded = expandedTrades.has(tradeId);
                      
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + index * 0.1 }}
                          className="rounded-lg border border-primary/20 bg-linear-to-br from-primary/10 via-primary/5 to-primary/10 shadow-md overflow-hidden"
                        >
                          {/* Compact Header - Always Visible */}
                          <div 
                            className="p-3 cursor-pointer hover:bg-primary/5 transition-colors"
                            onClick={() => {
                              setExpandedTrades(prev => {
                                const newSet = new Set(prev);
                                if (isExpanded) {
                                  newSet.delete(tradeId);
                                } else {
                                  newSet.add(tradeId);
                                }
                                return newSet;
                              });
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <Zap className="h-4 w-4 text-primary shrink-0" />
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                                    <span className="font-semibold text-sm truncate">{suggestion.market}</span>
                                    {suggestion.preferred && (
                                      <Badge className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 border-yellow-500/30 shrink-0">
                                        ⭐ Preferred
                                      </Badge>
                                    )}
                                  </div>
                                  <Badge 
                                    className={`text-xs shrink-0 ${
                                      suggestion.side?.toLowerCase() === 'buy' 
                                        ? 'bg-green-500/20 text-green-500 border-green-500/30' 
                                        : 'bg-red-500/20 text-red-500 border-red-500/30'
                                    }`}
                                  >
                                    {suggestion.side?.toUpperCase()}
                                  </Badge>
                                  <span className="text-sm font-medium">{suggestion.size}</span>
                                  <Badge 
                                    variant={
                                      suggestion.risk === 'low' ? 'default' :
                                      suggestion.risk === 'medium' ? 'secondary' :
                                      'destructive'
                                    }
                                    className="text-xs shrink-0"
                                  >
                                    {suggestion.risk?.toUpperCase()}
                                  </Badge>
                                  {suggestion.confidence && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${suggestion.confidence * 100}%` }}
                                          className="h-full bg-linear-to-r from-primary to-primary/80 rounded-full"
                                        />
                                      </div>
                                      <span className="text-xs font-medium text-muted-foreground">
                                        {Math.round(suggestion.confidence * 100)}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-3 pt-0 border-t border-primary/10">
                                  <div className="grid grid-cols-2 gap-3 text-sm pt-3">
                                    {suggestion.orderType && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">Order Type</p>
                                        <p className="font-semibold">{suggestion.orderType.toUpperCase()}</p>
                                      </div>
                                    )}
                                    {suggestion.price && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">Price</p>
                                        <p className="font-semibold">${suggestion.price.toLocaleString()}</p>
                                      </div>
                                    )}
                                    {suggestion.slPrice && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">Stop Loss</p>
                                        <p className="font-semibold text-red-500">${suggestion.slPrice.toLocaleString()}</p>
                                      </div>
                                    )}
                                    {suggestion.tpPrice && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">Take Profit</p>
                                        <p className="font-semibold text-green-500">${suggestion.tpPrice.toLocaleString()}</p>
                                      </div>
                                    )}
                                    {suggestion.leverage && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">Leverage</p>
                                        <p className="font-semibold">{suggestion.leverage}x</p>
                                      </div>
                                    )}
                                    {suggestion.riskRewardRatio && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">Risk/Reward</p>
                                        <p className="font-semibold">{suggestion.riskRewardRatio}</p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Execute Trade Button */}
                                  <div className="mt-4 pt-3 border-t border-primary/10">
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        executeTrade(suggestion);
                                      }}
                                      disabled={executingTrades.has(`${suggestion.market}-${suggestion.side}`) || !address}
                                      className="w-full bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold"
                                      size="sm"
                                    >
                                      {executingTrades.has(`${suggestion.market}-${suggestion.side}`) ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Executing...
                                        </>
                                      ) : (
                                        <>
                                          <Play className="h-4 w-4 mr-2" />
                                          Execute Trade
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
                {/* Single Trade Suggestion - Compact & Expandable */}
                {message.tradeSuggestion && !message.tradeSuggestions && (() => {
                  const tradeId = `${message.id}-trade-single`;
                  const isExpanded = expandedTrades.has(tradeId);
                  
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="mt-3 max-w-[85%] rounded-lg border border-primary/20 bg-linear-to-br from-primary/10 via-primary/5 to-primary/10 shadow-md overflow-hidden"
                    >
                      {/* Compact Header - Always Visible */}
                      <div 
                        className="p-3 cursor-pointer hover:bg-primary/5 transition-colors"
                        onClick={() => {
                          setExpandedTrades(prev => {
                            const newSet = new Set(prev);
                            if (isExpanded) {
                              newSet.delete(tradeId);
                            } else {
                              newSet.add(tradeId);
                            }
                            return newSet;
                          });
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <Zap className="h-4 w-4 text-primary shrink-0" />
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-semibold text-sm truncate">{message.tradeSuggestion.market}</span>
                                {message.tradeSuggestion.preferred && (
                                  <Badge className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 border-yellow-500/30 shrink-0">
                                    ⭐ Preferred
                                  </Badge>
                                )}
                              </div>
                              <Badge 
                                className={`text-xs shrink-0 ${
                                  message.tradeSuggestion.side?.toLowerCase() === 'buy' 
                                    ? 'bg-green-500/20 text-green-500 border-green-500/30' 
                                    : 'bg-red-500/20 text-red-500 border-red-500/30'
                                }`}
                              >
                                {message.tradeSuggestion.side?.toUpperCase()}
                              </Badge>
                              <span className="text-sm font-medium">{message.tradeSuggestion.size}</span>
                              <Badge 
                                variant={
                                  message.tradeSuggestion.risk === 'low' ? 'default' :
                                  message.tradeSuggestion.risk === 'medium' ? 'secondary' :
                                  'destructive'
                                }
                                className="text-xs shrink-0"
                              >
                                {message.tradeSuggestion.risk?.toUpperCase()}
                              </Badge>
                              {message.tradeSuggestion.confidence && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${message.tradeSuggestion.confidence * 100}%` }}
                                      className="h-full bg-linear-to-r from-primary to-primary/80 rounded-full"
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {Math.round(message.tradeSuggestion.confidence * 100)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 pt-0 border-t border-primary/10">
                              <div className="grid grid-cols-2 gap-3 text-sm pt-3">
                                {message.tradeSuggestion.orderType && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Order Type</p>
                                    <p className="font-semibold">{message.tradeSuggestion.orderType.toUpperCase()}</p>
                                  </div>
                                )}
                                {message.tradeSuggestion.price && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Price</p>
                                    <p className="font-semibold">${message.tradeSuggestion.price.toLocaleString()}</p>
                                  </div>
                                )}
                                {message.tradeSuggestion.slPrice && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Stop Loss</p>
                                    <p className="font-semibold text-red-500">${message.tradeSuggestion.slPrice.toLocaleString()}</p>
                                  </div>
                                )}
                                {message.tradeSuggestion.tpPrice && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Take Profit</p>
                                    <p className="font-semibold text-green-500">${message.tradeSuggestion.tpPrice.toLocaleString()}</p>
                                  </div>
                                )}
                                {message.tradeSuggestion.leverage && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Leverage</p>
                                    <p className="font-semibold">{message.tradeSuggestion.leverage}x</p>
                                  </div>
                                )}
                                {message.tradeSuggestion.riskRewardRatio && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Risk/Reward</p>
                                    <p className="font-semibold">{message.tradeSuggestion.riskRewardRatio}</p>
                                  </div>
                                )}
                              </div>
                              
                              {/* Execute Trade Button */}
                              <div className="mt-4 pt-3 border-t border-primary/10">
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        executeTrade(message.tradeSuggestion);
                                      }}
                                      disabled={executingTrades.has(`${message.tradeSuggestion.market}-${message.tradeSuggestion.side}`) || !address}
                                      className="w-full bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold"
                                      size="sm"
                                    >
                                      {executingTrades.has(`${message.tradeSuggestion.market}-${message.tradeSuggestion.side}`) ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Executing...
                                        </>
                                      ) : (
                                        <>
                                          <Play className="h-4 w-4 mr-2" />
                                          Execute Trade
                                        </>
                                      )}
                                    </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })()}
              </div>
            </motion.div>
          ))}
          </AnimatePresence>
        )}

        {/* Streaming message */}
        {isLoading && streamingContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <Avatar className="shrink-0 w-8 h-8">
              <AvatarFallback className="bg-linear-to-br from-purple-500 to-pink-500 text-white">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="inline-block rounded-2xl px-4 py-3 bg-muted/50 max-w-[85%]">
                <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground prose-code:text-foreground prose-pre:text-foreground">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="ml-2">{children}</li>,
                      h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                      code: ({ children }) => <code className="bg-muted/50 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                      pre: ({ children }) => <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto mb-2">{children}</pre>,
                    }}
                  >
                    {streamingContent}
                  </ReactMarkdown>
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block w-2 h-4 bg-foreground ml-1"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading indicator with progress steps */}
        {isLoading && !streamingContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <Avatar className="shrink-0 w-8 h-8">
              <AvatarFallback className="bg-linear-to-br from-purple-500 to-pink-500 text-white">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="inline-block rounded-2xl px-4 py-3 bg-muted/50 max-w-[85%]">
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground font-medium">AI is analyzing...</span>
                </div>
                {/* Progress Steps */}
                {progressSteps.length > 0 && (
                  <div className="space-y-2 mt-3 pt-3 border-t border-border/30">
                    {progressSteps.map((step, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-2 text-xs"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          step.includes('✅') ? 'bg-green-500' : 
                          step.includes('📊') || step.includes('📈') || step.includes('🤖') ? 'bg-primary animate-pulse' : 
                          'bg-muted-foreground'
                        }`} />
                        <span className={`${
                          step.includes('✅') ? 'text-green-500' : 
                          'text-muted-foreground'
                        }`}>
                          {step}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
                {progressSteps.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span>Initializing analysis...</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <Separator />

      {/* Input Area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-card/50 backdrop-blur-sm border-t border-border/50"
      >
        {!address && (
          <Alert className="mb-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Please connect your wallet to use the AI assistant.
            </AlertDescription>
          </Alert>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about balance, market sentiment, or place a trade..."
              className="w-full min-h-[44px] max-h-[120px] px-4 py-3 rounded-lg border border-border/50 bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !address}
              rows={1}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !address}
            size="icon"
            className="h-11 w-11 shrink-0 bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Shift</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Enter</kbd>
            <span className="ml-1">for new line</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setInput("What's my balance?")}
            disabled={!address}
          >
            <TrendingUp className="h-3 w-3 mr-1.5" />
            Balance
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setInput('Analyze BTC market sentiment')}
            disabled={!address}
          >
            <Zap className="h-3 w-3 mr-1.5" />
            Market Analysis
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setInput('Suggest trades for BTC')}
            disabled={!address}
          >
            <Sparkles className="h-3 w-3 mr-1.5" />
            Trade Ideas
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
