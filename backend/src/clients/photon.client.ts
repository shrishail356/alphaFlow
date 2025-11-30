import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';

export interface PhotonRegisterResponse {
  success: boolean;
  data: {
    user: {
      user: {
        id: string;
        name: string;
        avatar: string;
      };
      user_identities: Array<{
        id: string;
        user_id: string;
        provider: string;
        provider_id: string;
      }>;
    };
    tokens: {
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token: string;
      scope?: string;
      expires_at?: string;
    };
    wallet: {
      walletAddress: string;
      photonUserId?: string; // Some responses might have this
    };
  };
}

export interface PhotonEventResponse {
  success: boolean;
  data: {
    success: boolean;
    event_id: string;
    token_amount: number;
    token_symbol: string;
    campaign_id: string;
  };
}

export class PhotonClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: env.PHOTON_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': env.PHOTON_API_KEY || ''
      }
    });
  }

  async registerUser(jwtToken: string, clientUserId: string): Promise<PhotonRegisterResponse> {
    try {
      const response = await this.client.post<PhotonRegisterResponse>('/identity/register', {
        provider: 'jwt',
        data: {
          token: jwtToken,
          client_user_id: clientUserId
        }
      });
      return response.data;
    } catch (error: any) {
      // Log the actual error response from Photon
      if (error.response) {
        console.error('Photon API Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
        throw new Error(
          `Photon registration failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }

  async sendEvent(data: {
    event_id: string;
    event_type: string;
    user_id: string;
    campaign_id: string;
    metadata?: Record<string, unknown>;
    timestamp?: string;
    accessToken: string;
  }): Promise<PhotonEventResponse> {
    const response = await this.client.post<PhotonEventResponse>(
      '/attribution/events/campaign',
      {
        event_id: data.event_id,
        event_type: data.event_type,
        user_id: data.user_id,
        campaign_id: data.campaign_id,
        metadata: data.metadata || {},
        timestamp: data.timestamp || new Date().toISOString()
      },
      {
        headers: {
          Authorization: `Bearer ${data.accessToken}`
        }
      }
    );
    return response.data;
  }
}

export const photonClient = new PhotonClient();

