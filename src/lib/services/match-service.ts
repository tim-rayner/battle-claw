import { ApiClient } from '../api-client';
import {
  PubgApiResponse,
  MatchData,
  AssetData,
  RosterData,
  ParticipantData,
  ParticipantStats,
  ProcessedMatchData,
} from '../../types';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export class MatchService {
  constructor(private api: ApiClient) {}

  async getMatch(matchId: string, platform: string): Promise<ProcessedMatchData> {
    const cache = this.api.getCache();
    const key = cache.matchKey(matchId);
    const cached = cache.get<ProcessedMatchData>(key);
    if (cached) return cached;

    const response = await this.api.get<PubgApiResponse<MatchData>>(
      `/${platform}/matches/${matchId}`
    );

    const match = response.data;
    const included = response.included ?? [];

    // Extract telemetry URL
    const assets = included.filter((i): i is AssetData => i.type === 'asset') as AssetData[];
    const telemetryAsset = assets.find(a => a.attributes.name === 'telemetry');

    // Extract rosters and participants
    const rosters = included.filter((i): i is RosterData => i.type === 'roster') as RosterData[];
    const participants = included.filter((i): i is ParticipantData => i.type === 'participant') as ParticipantData[];

    const allStats: ParticipantStats[] = participants.map(p => p.attributes.stats);
    const playerStatsMap: Record<string, ParticipantStats> = {};
    for (const p of participants) {
      playerStatsMap[p.attributes.stats.name] = p.attributes.stats;
    }

    const processed: ProcessedMatchData = {
      matchId,
      mapName: match.attributes.mapName,
      gameMode: match.attributes.gameMode,
      createdAt: match.attributes.createdAt,
      duration: match.attributes.duration,
      participants: allStats,
      telemetry: null,
      telemetryUrl: telemetryAsset?.attributes?.URL,
      playerStats: playerStatsMap,
      rosters,
    } as ProcessedMatchData & { telemetryUrl?: string; rosters: RosterData[] };

    // Cache for 24 hours (match data is static)
    cache.set(key, processed, 86400);
    return processed;
  }

  async getRecentMatches(
    matchIds: string[],
    platform: string,
    limit = 5,
    gameMode?: string
  ): Promise<ProcessedMatchData[]> {
    const now = Date.now();
    const cutoff = now - FOURTEEN_DAYS_MS;

    // Filter to recent matches and limit count
    const recentIds = matchIds.slice(0, Math.min(matchIds.length, limit * 2)); // Fetch extra to account for filtering

    const matchPromises = recentIds.map(id =>
      this.getMatch(id, platform).catch(() => null)
    );

    const matches = (await Promise.all(matchPromises)).filter(
      (m): m is ProcessedMatchData => {
        if (!m) return false;
        const matchTime = new Date(m.createdAt).getTime();
        if (matchTime < cutoff) return false;
        if (gameMode && !m.gameMode.toLowerCase().includes(gameMode.toLowerCase())) return false;
        return true;
      }
    );

    return matches.slice(0, limit);
  }

  extractTelemetryUrl(match: ProcessedMatchData): string | null {
    const extended = match as ProcessedMatchData & { telemetryUrl?: string };
    return extended.telemetryUrl ?? null;
  }

  isWithin14Days(createdAt: string): boolean {
    const matchTime = new Date(createdAt).getTime();
    return Date.now() - matchTime < FOURTEEN_DAYS_MS;
  }
}
