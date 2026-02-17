import { ApiClient } from '../api-client';
import { PubgApiResponse, PlayerData } from '../../types';

export class PlayerService {
  constructor(private api: ApiClient) {}

  async getPlayersByName(names: string[], platform: string): Promise<PlayerData[]> {
    const cache = this.api.getCache();

    // Check cache first
    const uncached: string[] = [];
    const results: PlayerData[] = [];

    for (const name of names) {
      const key = cache.playerKey(name, platform);
      const cached = cache.get<PlayerData>(key);
      if (cached) {
        results.push(cached);
      } else {
        uncached.push(name);
      }
    }

    if (uncached.length === 0) return results;

    const nameFilter = uncached.join(',');
    const response = await this.api.get<PubgApiResponse<PlayerData[]>>(
      `/${platform}/players?filter[playerNames]=${encodeURIComponent(nameFilter)}`
    );

    const players = Array.isArray(response.data) ? response.data : [response.data];

    for (const player of players) {
      const key = cache.playerKey(player.attributes.name, platform);
      cache.set(key, player, 3600); // Cache for 1 hour
      results.push(player);
    }

    return results;
  }

  async getPlayerById(accountId: string, platform: string): Promise<PlayerData> {
    const cache = this.api.getCache();
    const key = `player-id:${platform}:${accountId}`;
    const cached = cache.get<PlayerData>(key);
    if (cached) return cached;

    const response = await this.api.get<PubgApiResponse<PlayerData>>(
      `/${platform}/players/${accountId}`
    );

    cache.set(key, response.data, 3600);
    return response.data;
  }

  async getSeasonStats(accountId: string, seasonId: string, platform: string): Promise<unknown> {
    const cache = this.api.getCache();
    const key = cache.seasonKey(accountId, seasonId, platform);
    const cached = cache.get<unknown>(key);
    if (cached) return cached;

    const response = await this.api.get<unknown>(
      `/${platform}/players/${accountId}/seasons/${seasonId}`
    );

    // Season stats are static, cache for 24 hours
    cache.set(key, response, 86400);
    return response;
  }

  async getCurrentSeason(platform: string): Promise<string> {
    const cache = this.api.getCache();
    const key = `current-season:${platform}`;
    const cached = cache.get<string>(key);
    if (cached) return cached;

    const response = await this.api.get<PubgApiResponse<Array<{ id: string; attributes: { isCurrentSeason: boolean } }>>>(
      `/${platform}/seasons`
    );

    const seasons = Array.isArray(response.data) ? response.data : [];
    const current = seasons.find(s => s.attributes.isCurrentSeason);

    if (!current) {
      // Fall back to most recent
      const seasonId = seasons[seasons.length - 1]?.id ?? 'division.bro.official.pc-2018-01';
      cache.set(key, seasonId, 3600);
      return seasonId;
    }

    cache.set(key, current.id, 3600);
    return current.id;
  }

  async getWeaponMastery(accountId: string, platform: string): Promise<unknown> {
    const cache = this.api.getCache();
    const key = cache.masteryKey(accountId, platform);
    const cached = cache.get<unknown>(key);
    if (cached) return cached;

    const response = await this.api.get<unknown>(
      `/${platform}/players/${accountId}/weapon_mastery`
    );

    cache.set(key, response, 3600);
    return response;
  }
}
