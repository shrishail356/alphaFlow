import { pool } from '../clients/db';

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  ai_model?: string;
  tokens_used?: number;
  response_time_ms?: number;
  trade_signal?: any;
  has_trade_signal?: boolean;
  market_data_snapshot?: any;
  created_at: Date;
}

export class ChatService {
  /**
   * Save a chat message to the database
   */
  async saveMessage(
    userId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    options?: {
      aiModel?: string;
      tokensUsed?: number;
      responseTimeMs?: number;
      tradeSignal?: any;
      marketDataSnapshot?: any;
    }
  ): Promise<ChatMessage> {
    const query = `
      INSERT INTO chat_messages (
        user_id,
        role,
        content,
        ai_model,
        tokens_used,
        response_time_ms,
        trade_signal,
        has_trade_signal,
        market_data_snapshot
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      userId,
      role,
      content,
      options?.aiModel || null,
      options?.tokensUsed || null,
      options?.responseTimeMs || null,
      options?.tradeSignal ? JSON.stringify(options.tradeSignal) : null,
      !!options?.tradeSignal,
      options?.marketDataSnapshot ? JSON.stringify(options.marketDataSnapshot) : null,
    ];

    const result = await pool.query(query, values);
    return this.mapRowToMessage(result.rows[0]);
  }

  /**
   * Get chat history for a user
   */
  async getChatHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatMessage[]> {
    const query = `
      SELECT *
      FROM chat_messages
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows.map(row => this.mapRowToMessage(row)).reverse(); // Reverse to get chronological order
  }

  /**
   * Get chat history for a user (most recent first)
   */
  async getRecentChatHistory(
    userId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    const query = `
      SELECT *
      FROM chat_messages
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows.map(row => this.mapRowToMessage(row)).reverse(); // Reverse to get chronological order
  }

  /**
   * Delete chat history for a user
   */
  async deleteChatHistory(userId: string): Promise<void> {
    const query = `
      DELETE FROM chat_messages
      WHERE user_id = $1
    `;

    await pool.query(query, [userId]);
  }

  /**
   * Get chat statistics for a user
   */
  async getChatStats(userId: string): Promise<{
    totalMessages: number;
    totalTradeSignals: number;
    lastMessageAt: Date | null;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE has_trade_signal = true) as total_trade_signals,
        MAX(created_at) as last_message_at
      FROM chat_messages
      WHERE user_id = $1
    `;

    const result = await pool.query(query, [userId]);
    const row = result.rows[0];

    return {
      totalMessages: parseInt(row.total_messages) || 0,
      totalTradeSignals: parseInt(row.total_trade_signals) || 0,
      lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : null,
    };
  }

  /**
   * Map database row to ChatMessage interface
   */
  private mapRowToMessage(row: any): ChatMessage {
    return {
      id: row.id,
      user_id: row.user_id,
      role: row.role,
      content: row.content,
      ai_model: row.ai_model,
      tokens_used: row.tokens_used,
      response_time_ms: row.response_time_ms,
      trade_signal: row.trade_signal ? (typeof row.trade_signal === 'string' ? JSON.parse(row.trade_signal) : row.trade_signal) : null,
      has_trade_signal: row.has_trade_signal || false,
      market_data_snapshot: row.market_data_snapshot ? (typeof row.market_data_snapshot === 'string' ? JSON.parse(row.market_data_snapshot) : row.market_data_snapshot) : null,
      created_at: new Date(row.created_at),
    };
  }
}

export const chatService = new ChatService();

