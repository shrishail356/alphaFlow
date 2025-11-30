// Account & Subaccount Types
export interface DecibelSubaccount {
  subaccount_address: string;
  primary_account_address: string;
  is_primary: boolean;
  is_active: boolean;
  custom_label?: string | null;
}

export interface DecibelAccountOverview {
  perp_equity_balance: number;
  unrealized_pnl: number;
  unrealized_funding_cost: number;
  cross_margin_ratio: number;
  maintenance_margin: number;
  cross_account_leverage_ratio: number;
  total_margin: number;
  usdc_cross_withdrawable_balance: number;
  usdc_isolated_withdrawable_balance: number;
  volume?: number | null;
  all_time_return?: number | null;
  average_cash_position?: number | null;
  average_leverage?: number | null;
  cross_account_position?: number | null;
  max_drawdown?: number | null;
  pnl_90d?: number | null;
  sharpe_ratio?: number | null;
  weekly_win_rate_12w?: number | null;
}

// Market Data Types
export interface DecibelMarket {
  market_addr: string;
  market_name: string;
  max_leverage: number;
  max_open_interest: number;
  min_size: number;
  px_decimals: number;
  sz_decimals: number;
  tick_size: number;
  lot_size: number;
}

export interface DecibelPrice {
  market: string;
  oracle_px: number;
  mark_px: number;
  mid_px: number;
  funding_rate_bps: number;
  is_funding_positive: boolean;
  open_interest: number;
  transaction_unix_ms: number;
}

export interface DecibelOrderBookLevel {
  price: number;
  size: number;
}

export interface DecibelOrderBook {
  market: string;
  bids: DecibelOrderBookLevel[];
  asks: DecibelOrderBookLevel[];
}

export interface DecibelTrade {
  account: string;
  market: string;
  action: string;
  trade_id: number;
  size: number;
  price: number;
  is_profit: boolean;
  realized_pnl_amount: number;
  is_funding_positive: boolean;
  realized_funding_amount: number;
  is_rebate: boolean;
  fee_amount: number;
  order_id: string;
  client_order_id: string;
  transaction_unix_ms: number;
  transaction_version: number;
}

export interface DecibelCandlestick {
  t: number; // start time
  T: number; // end time
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
  i: string; // interval
}

// User Data Types
export interface DecibelPosition {
  market: string;
  user: string;
  size: number;
  user_leverage: number;
  max_allowed_leverage: number;
  entry_price: number;
  is_isolated: boolean;
  is_deleted: boolean;
  unrealized_funding: number;
  event_uid: number;
  estimated_liquidation_price: number;
  transaction_version: number;
  has_fixed_sized_tpsls: boolean;
  sl_limit_price?: number | null;
  sl_order_id?: string | null;
  sl_trigger_price?: number | null;
  tp_limit_price?: number | null;
  tp_order_id?: string | null;
  tp_trigger_price?: number | null;
}

export interface DecibelOrder {
  parent: string;
  market: string;
  client_order_id: string;
  order_id: string;
  status: string;
  order_type: string;
  trigger_condition: string;
  order_direction: string;
  is_buy: boolean;
  is_reduce_only: boolean;
  details: string;
  transaction_version: number;
  unix_ms: number;
  orig_size?: number | null;
  price?: number | null;
  remaining_size?: number | null;
  size_delta?: number | null;
  sl_limit_price?: number | null;
  sl_order_id?: string | null;
  sl_trigger_price?: number | null;
  tp_limit_price?: number | null;
  tp_order_id?: string | null;
  tp_trigger_price?: number | null;
}

