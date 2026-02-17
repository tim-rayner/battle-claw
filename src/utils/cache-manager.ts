import NodeCache from 'node-cache';

export class CacheManager {
  private cache: NodeCache;
  private enabled: boolean;

  constructor(ttl = 3600, enabled = true) {
    this.enabled = enabled;
    this.cache = new NodeCache({
      stdTTL: ttl,
      checkperiod: 120,
    });
  }

  get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined;
    return this.cache.get<T>(key);
  }

  set<T>(key: string, value: T, ttl?: number): boolean {
    if (!this.enabled) return false;
    if (ttl !== undefined) {
      return this.cache.set(key, value, ttl);
    }
    return this.cache.set(key, value);
  }

  del(key: string): number {
    return this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
  }

  playerKey(playerName: string, platform: string): string {
    return `player:${platform}:${playerName.toLowerCase()}`;
  }

  matchKey(matchId: string): string {
    return `match:${matchId}`;
  }

  telemetryKey(matchId: string): string {
    return `telemetry:${matchId}`;
  }

  seasonKey(accountId: string, seasonId: string, platform: string): string {
    return `season:${platform}:${accountId}:${seasonId}`;
  }

  masteryKey(accountId: string, platform: string): string {
    return `mastery:${platform}:${accountId}`;
  }

  getStats(): { keys: number; hits: number; misses: number } {
    const stats = this.cache.getStats();
    return {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
    };
  }
}
