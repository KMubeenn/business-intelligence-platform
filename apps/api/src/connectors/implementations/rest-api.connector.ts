import { BaseConnector } from '../base.connector';
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

export interface RestApiConfig {
  baseUrl: string;
  auth?: {
    type: 'BEARER' | 'API_KEY' | 'BASIC' | 'NONE';
    token?: string;
    keyName?: string;
    keyPlacement?: 'header' | 'query';
  };
  endpoints: Array<{
    name: string;
    path: string;
    method?: 'GET' | 'POST';
    pagination?: {
      type: 'page' | 'cursor' | 'offset';
      paramName: string;
      startAt?: number | string;
    };
  }>;
}

export class RestApiConnector extends BaseConnector {
  private client: AxiosInstance;

  constructor(config: RestApiConfig) {
    super(config);
    this.client = this.createClient(config);
  }

  private createClient(config: RestApiConfig): AxiosInstance {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.auth) {
      if (config.auth.type === 'BEARER' && config.auth.token) {
        headers['Authorization'] = `Bearer ${config.auth.token}`;
      } else if (config.auth.type === 'API_KEY' && config.auth.keyPlacement === 'header' && config.auth.keyName && config.auth.token) {
        headers[config.auth.keyName] = config.auth.token;
      }
    }

    const client = axios.create({
      baseURL: config.baseUrl,
      headers,
    });

    // Add interceptor for API key in query if needed
    if (config.auth?.type === 'API_KEY' && config.auth.keyPlacement === 'query' && config.auth.keyName && config.auth.token) {
      client.interceptors.request.use((req) => {
        req.params = req.params || {};
        req.params[config.auth!.keyName!] = config.auth!.token;
        return req;
      });
    }

    // Configure exponential backoff for 429 and 5xx errors
    axiosRetry(client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
      },
    });

    return client;
  }

  async connect(): Promise<void> {
    // REST API is stateless, no persistent connection needed
  }

  async disconnect(): Promise<void> {
    // No action needed
  }

  async validate(): Promise<boolean> {
    const config = this.config as RestApiConfig;
    return !!config.baseUrl && Array.isArray(config.endpoints) && config.endpoints.length > 0;
  }

  async testConnection(): Promise<boolean> {
    try {
      const config = this.config as RestApiConfig;
      // Test the first endpoint to verify connection and auth
      if (config.endpoints.length > 0) {
        const ep = config.endpoints[0];
        await this.client.request({
          url: ep.path,
          method: ep.method || 'GET',
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('REST API Connection test failed:', error);
      return false;
    }
  }

  async getTables(): Promise<string[]> {
    const config = this.config as RestApiConfig;
    return config.endpoints.map(ep => ep.name);
  }

  async getColumns(tableName: string): Promise<any[]> {
    const config = this.config as RestApiConfig;
    const ep = config.endpoints.find(e => e.name === tableName);
    if (!ep) throw new Error(`Endpoint ${tableName} not found in configuration`);

    try {
      const response = await this.client.request({
        url: ep.path,
        method: ep.method || 'GET',
      });

      let data = response.data;
      // Handle wrapped responses, e.g. { "users": [...] } or { "data": [...] }
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        // Try to find the first array property
        for (const key of Object.keys(data)) {
          if (Array.isArray(data[key])) {
            data = data[key];
            break;
          }
        }
      }

      if (Array.isArray(data) && data.length > 0) {
        // Extract keys from the first object
        return Object.keys(data[0]).map(key => ({
          Field: key,
          Type: typeof data[0][key],
        }));
      }

      return [];
    } catch (error) {
      console.error(`Failed to discover schema for ${tableName}:`, error);
      return [];
    }
  }

  async sync(tableName: string, incrementalColumn?: string | null, lastSyncTimestamp?: Date | null): Promise<Record<string, unknown>[]> {
    const config = this.config as RestApiConfig;
    const ep = config.endpoints.find(e => e.name === tableName);
    if (!ep) throw new Error(`Endpoint ${tableName} not found in configuration`);

    const records: Record<string, unknown>[] = [];
    let hasMore = true;
    let currentParam = ep.pagination?.startAt || 1;

    // A safety limit to prevent infinite loops during pagination
    let safetyCounter = 0;
    const MAX_PAGES = 50;

    while (hasMore && safetyCounter < MAX_PAGES) {
      safetyCounter++;
      try {
        const params: Record<string, any> = {};
        if (ep.pagination && ep.pagination.paramName) {
          params[ep.pagination.paramName] = currentParam;
        }

        const response = await this.client.request({
          url: ep.path,
          method: ep.method || 'GET',
          params,
        });

        let data = response.data;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          for (const key of Object.keys(data)) {
            if (Array.isArray(data[key])) {
              data = data[key];
              break;
            }
          }
        }

        if (Array.isArray(data) && data.length > 0) {
          records.push(...data);

          if (!ep.pagination) {
            hasMore = false; // No pagination configured
          } else if (ep.pagination.type === 'page') {
            currentParam = (typeof currentParam === 'number' ? currentParam : parseInt(currentParam, 10)) + 1;
          } else if (ep.pagination.type === 'offset') {
            currentParam = (typeof currentParam === 'number' ? currentParam : parseInt(currentParam, 10)) + data.length;
          } else {
            // Unhandled pagination type, break to avoid infinite loop
            hasMore = false;
          }
        } else {
          // Empty response, stop pagination
          hasMore = false;
        }
      } catch (error) {
        console.error(`Failed to sync ${tableName}:`, error);
        hasMore = false;
      }
    }

    return records;
  }
}
