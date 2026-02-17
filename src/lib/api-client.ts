import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { RateLimiter } from '../utils/rate-limiter';
import { CacheManager } from '../utils/cache-manager';

const gunzip = promisify(zlib.gunzip);

export class PUBGAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string
  ) {
    super(message);
    this.name = 'PUBGAPIError';
  }
}

export class ApiClient {
  private client: AxiosInstance;
  private telemetryClient: AxiosInstance;
  private rateLimiter: RateLimiter;
  private cache: CacheManager;
  private baseUrl = 'https://api.pubg.com/shards';

  constructor(apiKey: string, rateLimitPerMin = 10, cacheEnabled = true) {
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/vnd.api+json',
    };

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers,
      timeout: 30000,
    });

    this.telemetryClient = axios.create({
      timeout: 120000, // Telemetry files can be large
      headers: {
        'Accept-Encoding': 'gzip',
      },
      responseType: 'arraybuffer',
    });

    this.rateLimiter = new RateLimiter(rateLimitPerMin, 60000);
    this.cache = new CacheManager(3600, cacheEnabled);
  }

  getCache(): CacheManager {
    return this.cache;
  }

  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    await this.rateLimiter.waitIfNeeded();

    try {
      const response = await this.client.get<T>(path, config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const url = `${this.baseUrl}${path}`;

        switch (status) {
          case 401:
            throw new PUBGAPIError(
              'Invalid API key. Check PUBG_API_KEY environment variable.',
              401,
              url
            );
          case 404:
            throw new PUBGAPIError(
              'Resource not found. Player or match may not exist.',
              404,
              url
            );
          case 429:
            throw new PUBGAPIError(
              'Rate limit exceeded. Please wait before retrying.',
              429,
              url
            );
          default:
            throw new PUBGAPIError(
              `API request failed with status ${status}: ${error.message}`,
              status,
              url
            );
        }
      }
      throw error;
    }
  }

  async fetchTelemetry(url: string): Promise<unknown[]> {
    const cacheKey = `telemetry:${url}`;
    const cached = this.cache.get<unknown[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.telemetryClient.get(url);
      const buffer = Buffer.from(response.data as ArrayBuffer);

      let jsonData: string;
      try {
        const decompressed = await gunzip(buffer);
        jsonData = decompressed.toString('utf-8');
      } catch {
        // Not gzipped, use raw
        jsonData = buffer.toString('utf-8');
      }

      const events = JSON.parse(jsonData) as unknown[];

      // Cache telemetry for 24 hours (it never changes)
      this.cache.set(cacheKey, events, 86400);

      return events;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new PUBGAPIError(
          `Failed to fetch telemetry: ${error.message}`,
          error.response?.status ?? 0,
          url
        );
      }
      throw error;
    }
  }

  getRemainingRequests(): number {
    return this.rateLimiter.getRemainingRequests();
  }
}
