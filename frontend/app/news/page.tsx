'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, TrendingUp, TrendingDown, Minus, Filter, X, Calendar, Newspaper, Video, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface NewsItem {
  news_url: string;
  image_url: string;
  title: string;
  text: string;
  source_name: string;
  date: string;
  topics: string[];
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  type: 'Article' | 'Video';
  tickers?: string[];
}

interface NewsResponse {
  data: NewsItem[];
  total_pages: number;
  total_items: number;
}

const POPULAR_TICKERS = ['BTC', 'ETH', 'SOL', 'XRP', 'APT', 'BNB', 'ADA', 'DOGE'];
const SENTIMENT_OPTIONS = [
  { value: 'all', label: 'All Sentiments', icon: Minus },
  { value: 'positive', label: 'Positive', icon: TrendingUp, color: 'text-green-500' },
  { value: 'negative', label: 'Negative', icon: TrendingDown, color: 'text-red-500' },
  { value: 'neutral', label: 'Neutral', icon: Minus, color: 'text-gray-500' },
];

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [selectedSentiment, setSelectedSentiment] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState<'ticker' | 'general'>('ticker');

  useEffect(() => {
    loadNews();
  }, [page, selectedTickers, selectedSentiment, selectedType, category]);

  const loadNews = async () => {
    setLoading(true);
    setError(null);
    try {
      // Free plan limit: max 3 items per request
      const params: any = {
        page,
        items: 3,
      };

      if (category === 'ticker' && selectedTickers.length > 0) {
        params.tickers = selectedTickers.join(',');
      } else if (category === 'general') {
        params.category = 'general';
      }

      if (selectedSentiment !== 'all') {
        params.sentiment = selectedSentiment;
      }

      if (selectedType !== 'all') {
        params.type = selectedType;
      }

      // Use rank sorting for better relevance
      if (category === 'ticker') {
        params.sortby = 'rank';
        params.days = 7;
      }

      const response = await api.get<NewsResponse & { warning?: string }>('/api/news', { params });
      setNews(response.data.data || []);
      setTotalPages(response.data.total_pages || 0);
      setTotalItems(response.data.total_items || 0);
      
      // Show warning if API limit is reached
      if (response.data.warning) {
        setError(response.data.warning);
      } else {
        setError(null);
      }
    } catch (err: any) {
      console.error('[News] Error loading news:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.warning || 'Failed to load news';
      setError(errorMessage);
      setNews([]);
      setTotalPages(0);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  const toggleTicker = (ticker: string) => {
    setSelectedTickers((prev) =>
      prev.includes(ticker)
        ? prev.filter((t) => t !== ticker)
        : [...prev, ticker]
    );
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700';
      case 'Negative':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300 dark:border-gray-700';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive':
        return <TrendingUp className="h-3 w-3" />;
      case 'Negative':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Crypto News
            </h1>
            <p className="text-muted-foreground mt-2">
              Stay updated with the latest cryptocurrency news and market insights
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Category Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={category === 'ticker' ? 'default' : 'outline'}
            onClick={() => {
              setCategory('ticker');
              setPage(1);
            }}
            size="sm"
          >
            Ticker News
          </Button>
          <Button
            variant={category === 'general' ? 'default' : 'outline'}
            onClick={() => {
              setCategory('general');
              setPage(1);
            }}
            size="sm"
          >
            General News
          </Button>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 rounded-lg border bg-card"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Filters</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFilters(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Ticker Selection */}
              {category === 'ticker' && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Select Tickers</p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_TICKERS.map((ticker) => (
                      <Badge
                        key={ticker}
                        variant={selectedTickers.includes(ticker) ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-primary/10"
                        onClick={() => toggleTicker(ticker)}
                      >
                        {ticker}
                      </Badge>
                    ))}
                  </div>
                  {selectedTickers.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTickers([]);
                        setPage(1);
                      }}
                      className="mt-2 text-xs"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
              )}

              {/* Sentiment Filter */}
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Sentiment</p>
                <div className="flex flex-wrap gap-2">
                  {SENTIMENT_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Button
                        key={option.value}
                        variant={selectedSentiment === option.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setSelectedSentiment(option.value);
                          setPage(1);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Icon className={`h-4 w-4 ${option.color || ''}`} />
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <p className="text-sm font-medium mb-2">Content Type</p>
                <div className="flex gap-2">
                  <Button
                    variant={selectedType === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedType('all');
                      setPage(1);
                    }}
                    className="flex items-center gap-2"
                  >
                    All
                  </Button>
                  <Button
                    variant={selectedType === 'article' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedType('article');
                      setPage(1);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Newspaper className="h-4 w-4" />
                    Articles
                  </Button>
                  <Button
                    variant={selectedType === 'video' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedType('video');
                      setPage(1);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Video className="h-4 w-4" />
                    Videos
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Filters Summary */}
        {(selectedTickers.length > 0 || selectedSentiment !== 'all' || selectedType !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {selectedTickers.map((ticker) => (
              <Badge key={ticker} variant="secondary" className="flex items-center gap-1">
                {ticker}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleTicker(ticker)}
                />
              </Badge>
            ))}
            {selectedSentiment !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {selectedSentiment}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => {
                    setSelectedSentiment('all');
                    setPage(1);
                  }}
                />
              </Badge>
            )}
            {selectedType !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {selectedType}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => {
                    setSelectedType('all');
                    setPage(1);
                  }}
                />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error/Warning State */}
      {error && (
        <div className={`p-4 rounded-lg border mb-4 ${
          error.includes('Free plan') || error.includes('limit')
            ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800'
            : 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800'
        }`}>
          <p className={error.includes('Free plan') || error.includes('limit')
            ? 'text-yellow-700 dark:text-yellow-400'
            : 'text-red-600 dark:text-red-400'
          }>
            {error}
            {error.includes('Free plan') && (
              <span className="block mt-2 text-sm">
                You can still browse news by changing pages. Each page shows up to 3 articles.
              </span>
            )}
          </p>
        </div>
      )}

      {/* News Grid */}
      {!loading && !error && (
        <>
          {news.length > 0 ? (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                Showing {news.length} of {totalItems} articles
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <AnimatePresence>
                  {news.map((item, index) => (
                    <motion.div
                      key={`${item.news_url}-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card className="h-full flex flex-col hover:shadow-lg transition-shadow cursor-pointer group">
                        <div className="relative w-full h-48 overflow-hidden rounded-t-lg bg-muted">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={item.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              unoptimized
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                              <Newspaper className="h-12 w-12" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 flex gap-2">
                            <Badge className={getSentimentColor(item.sentiment)}>
                              {getSentimentIcon(item.sentiment)}
                            </Badge>
                            {item.type === 'Video' && (
                              <Badge variant="secondary">
                                <Video className="h-3 w-3 mr-1" />
                                Video
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardContent className="p-4 flex-1 flex flex-col">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground font-medium">
                              {item.source_name}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(item.date)}
                            </span>
                          </div>
                          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">
                            {item.text}
                          </p>
                          {item.tickers && item.tickers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {item.tickers.slice(0, 5).map((ticker) => (
                                <Badge key={ticker} variant="outline" className="text-xs">
                                  {ticker}
                                </Badge>
                              ))}
                              {item.tickers.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{item.tickers.length - 5}
                                </Badge>
                              )}
                            </div>
                          )}
                          {item.topics && item.topics.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {item.topics.slice(0, 3).map((topic) => (
                                <Badge key={topic} variant="secondary" className="text-xs">
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <a
                            href={item.news_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-auto flex items-center gap-2 text-sm text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Read more
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No news found. Try adjusting your filters.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

