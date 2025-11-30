import { pool } from '../clients/db';

export interface User {
  id: string;
  wallet_address: string;
  photon_identity_id: string | null;
  email: string | null;
  username: string | null;
  display_name: string | null;
  wallet_type: string;
  is_signal_provider: boolean;
  photon_points: number;
  tier: string;
  created_at: Date;
}

export class UserService {
  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    return result.rows[0] || null;
  }

  async createUser(data: {
    wallet_address: string;
    wallet_type: string;
    email?: string;
    username?: string;
  }): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (wallet_address, wallet_type, email, username)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.wallet_address, data.wallet_type, data.email || null, data.username || null]
    );
    return result.rows[0];
  }

  async updatePhotonIdentity(
    userId: string,
    photonIdentityId: string,
    walletAddress: string
  ): Promise<User> {
    const result = await pool.query(
      `UPDATE users 
       SET photon_identity_id = $1, wallet_address = $2
       WHERE id = $3
       RETURNING *`,
      [photonIdentityId, walletAddress, userId]
    );
    return result.rows[0];
  }

  async findById(userId: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0] || null;
  }

  async updateUser(userId: string, data: {
    email?: string;
    display_name?: string;
    username?: string;
  }): Promise<User> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.display_name !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(data.display_name);
    }
    if (data.username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      values.push(data.username);
    }

    if (updates.length === 0) {
      const user = await this.findById(userId);
      if (!user) throw new Error('User not found');
      return user;
    }

    values.push(userId);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  }
}

export const userService = new UserService();

