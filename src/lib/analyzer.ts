import {
  AimAnalysis,
  CombatAnalysis,
  ParticipantStats,
  PlayerAnalysis,
  PlayerMatchStats,
  SquadAnalysis,
  TacticalAnalysis,
  WeaponAnalysis,
} from "../types";
import { AimAnalyzer } from "./analytics/aim-analyzer";
import { CombatAnalyzer } from "./analytics/combat-analyzer";
import { TacticalAnalyzer } from "./analytics/tactical-analyzer";
import { WeaponAnalyzer } from "./analytics/weapon-analyzer";
import { ApiClient } from "./api-client";
import { InsightGenerator } from "./insight-generator";
import { MatchService } from "./services/match-service";
import { PlayerService } from "./services/player-service";
import { TelemetryService } from "./services/telemetry-service";

export interface AnalyzeOptions {
  players: string[];
  matchCount: number;
  platform: string;
  gameMode?: string;
  fetchTelemetry?: boolean;
}

export class Analyzer {
  private playerService: PlayerService;
  private matchService: MatchService;
  private telemetryService: TelemetryService;
  private aimAnalyzer = new AimAnalyzer();
  private weaponAnalyzer = new WeaponAnalyzer();
  private tacticalAnalyzer = new TacticalAnalyzer();
  private combatAnalyzer = new CombatAnalyzer();
  private insightGenerator = new InsightGenerator();

  constructor(api: ApiClient) {
    this.playerService = new PlayerService(api);
    this.matchService = new MatchService(api);
    this.telemetryService = new TelemetryService(api);
  }

  async analyze(
    options: AnalyzeOptions,
    onProgress?: (msg: string) => void,
  ): Promise<SquadAnalysis> {
    const log =
      onProgress ?? ((msg: string) => process.stderr.write(`${msg}\n`));
    const {
      players: playerNames,
      matchCount,
      platform,
      gameMode,
      fetchTelemetry = true,
    } = options;

    log(`Fetching player data for: ${playerNames.join(", ")}...`);

    // Fetch player data in parallel
    const playersData = await this.playerService.getPlayersByName(
      playerNames,
      platform,
    );

    if (playersData.length === 0) {
      throw new Error(`No players found for: ${playerNames.join(", ")}`);
    }

    log(`Found ${playersData.length} player(s). Fetching recent matches...`);

    // Find common matches or individual matches
    const playerMatchIds = playersData.map((p) =>
      (p.relationships.matches.data ?? []).map((m: { id: string }) => m.id),
    );

    // Get matches for each player
    const allMatchIds = new Set<string>();
    for (const ids of playerMatchIds) {
      for (const id of ids) {
        allMatchIds.add(id);
      }
    }

    log(`Processing up to ${matchCount} recent matches...`);

    // Fetch matches (prioritize most recent)
    const matches = await this.matchService.getRecentMatches(
      [...allMatchIds],
      platform,
      matchCount,
      gameMode,
    );

    if (matches.length === 0) {
      throw new Error(
        "No recent matches found within the 14-day retention window. " +
          "Play some games first or check player names.",
      );
    }

    log(`Analyzing ${matches.length} match(es)...`);

    // Build per-player analysis
    const playerAnalyses: PlayerAnalysis[] = [];

    for (const player of playersData) {
      const playerName = player.attributes.name;
      log(`  Analyzing ${playerName}...`);

      const perMatchAim: AimAnalysis[] = [];
      const perMatchWeapons: WeaponAnalysis[] = [];
      const perMatchTactics: TacticalAnalysis[] = [];
      const perMatchCombat: CombatAnalysis[] = [];
      const matchStats: ParticipantStats[] = [];
      let analyzedCount = 0;

      for (const match of matches) {
        const participantStats = match.playerStats[playerName];
        if (!participantStats) continue; // Player wasn't in this match

        matchStats.push(participantStats);
        analyzedCount++;

        if (fetchTelemetry) {
          const telemetryUrl = this.matchService.extractTelemetryUrl(match);

          if (telemetryUrl) {
            try {
              const allTelemetry = await this.telemetryService.fetchAndFilter(
                telemetryUrl,
                [playerName],
              );
              const playerTelemetry = this.telemetryService.getEventsForPlayer(
                allTelemetry,
                playerName,
              );

              const aim = this.aimAnalyzer.analyze(playerTelemetry, playerName);
              const weapons = this.weaponAnalyzer.analyze(
                playerTelemetry,
                playerName,
                aim.weaponBreakdown,
              );
              const tactics = this.tacticalAnalyzer.analyze(
                playerTelemetry,
                playerName,
                match.duration,
                participantStats,
              );
              const combat = this.combatAnalyzer.analyze(
                playerTelemetry,
                playerName,
                participantStats,
              );

              perMatchAim.push(aim);
              perMatchWeapons.push(weapons);
              perMatchTactics.push(tactics);
              perMatchCombat.push(combat);
            } catch (err) {
              // Telemetry fetch failed, use stats-only analysis
              log(
                `    Warning: Could not fetch telemetry for match ${match.matchId}`,
              );
              perMatchCombat.push(
                this.combatAnalyzer.analyze(
                  {
                    attacks: [],
                    fireCountEvents: [],
                    kills: [],
                    damageTaken: [],
                    damageDealtEvents: [],
                    positions: [],
                    itemPickups: [],
                    itemEquips: [],
                    heals: [],
                    itemUses: [],
                    gameStates: [],
                    vehicleRides: [],
                    vehicleLeaves: [],
                  },
                  playerName,
                  participantStats,
                ),
              );
            }
          }
        }
      }

      if (matchStats.length === 0) continue;

      // Aggregate stats across matches
      const avgStats = this.averageStats(matchStats);
      // Use combat damage (excludes unused Punch) for damage-dealt average when we have telemetry
      if (perMatchCombat.length > 0) {
        avgStats.damageDealt =
          perMatchCombat.reduce((s, c) => s + c.damageDealt, 0) /
          perMatchCombat.length;
      }

      const aggregatedAim =
        perMatchAim.length > 0
          ? this.aimAnalyzer.aggregateAcrossMatches(perMatchAim)
          : this.emptyAimAnalysis();

      const aggregatedWeapons =
        perMatchWeapons.length > 0
          ? this.weaponAnalyzer.aggregateAcrossMatches(perMatchWeapons)
          : { mostEffective: "N/A", effectiveness: {}, rankings: [] };

      const aggregatedTactics =
        perMatchTactics.length > 0
          ? this.tacticalAnalyzer.aggregateAcrossMatches(perMatchTactics)
          : this.emptyTacticsAnalysis();

      const aggregatedCombat =
        perMatchCombat.length > 0
          ? this.combatAnalyzer.aggregateAcrossMatches(perMatchCombat)
          : this.emptyCombatAnalysis(avgStats);

      playerAnalyses.push({
        name: playerName,
        matchesAnalyzed: analyzedCount,
        avgStats,
        aim: aggregatedAim,
        weapons: aggregatedWeapons,
        tactics: aggregatedTactics,
        combat: aggregatedCombat,
      });
    }

    if (playerAnalyses.length === 0) {
      throw new Error(
        "None of the specified players participated in recent matches.",
      );
    }

    // Generate insights
    const insights = this.insightGenerator.generate(playerAnalyses);

    // Build date range
    const matchDates = matches.map((m) => new Date(m.createdAt).getTime());
    const dateRange = {
      start: new Date(Math.min(...matchDates)).toISOString(),
      end: new Date(Math.max(...matchDates)).toISOString(),
    };

    // Squad stats
    const squadStats = {
      avgPlacement:
        playerAnalyses.reduce((s, p) => s + p.avgStats.winPlace, 0) /
        playerAnalyses.length,
      totalKills:
        playerAnalyses.reduce((s, p) => s + p.avgStats.kills, 0) *
        matches.length,
      avgDamage: playerAnalyses.reduce((s, p) => s + p.avgStats.damageDealt, 0),
      avgSurvivalTime:
        playerAnalyses.reduce((s, p) => s + p.avgStats.survivalTime, 0) /
        playerAnalyses.length,
    };

    return {
      players: playerAnalyses,
      matchesAnalyzed: matches.length,
      dateRange,
      insights,
      squadStats,
    };
  }

  private averageStats(stats: ParticipantStats[]): PlayerMatchStats {
    const n = stats.length;
    const sum = (key: keyof ParticipantStats) =>
      stats.reduce((s, p) => s + (p[key] as number), 0) / n;

    return {
      name: stats[0].name,
      kills: sum("kills"),
      deaths: 1,
      assists: sum("assists"),
      damageDealt: sum("damageDealt"),
      damageTaken: 0, // Populated from telemetry in combat analyzer
      headshotKills: sum("headshotKills"),
      DBNOs: sum("DBNOs"),
      revives: sum("revives"),
      boosts: sum("boosts"),
      heals: sum("heals"),
      walkDistance: sum("walkDistance"),
      rideDistance: sum("rideDistance"),
      survivalTime: sum("timeSurvived"),
      winPlace: sum("winPlace"),
    };
  }

  private emptyAimAnalysis(): AimAnalysis {
    return {
      overallAccuracy: 0,
      weaponBreakdown: {},
      headshotRate: 0,
      bestWeapon: "N/A",
      bestWeaponAccuracy: 0,
    };
  }

  private emptyTacticsAnalysis(): TacticalAnalysis {
    return {
      zonePositioning: {
        insideZonePercent: 0,
        edgePlayPercent: 0,
        centerPlayPercent: 0,
        avgDistanceToCenter: 0,
        lateRotations: 0,
      },
      movementStyle: "moderate",
      hotDropFrequency: 0,
      avgSurvivalTime: 0,
    };
  }

  private emptyCombatAnalysis(stats: PlayerMatchStats): CombatAnalysis {
    return this.combatAnalyzer.aggregateAcrossMatches([
      this.combatAnalyzer.analyze(
        {
          attacks: [],
          fireCountEvents: [],
          kills: [],
          damageTaken: [],
          damageDealtEvents: [],
          positions: [],
          itemPickups: [],
          itemEquips: [],
          heals: [],
          itemUses: [],
          gameStates: [],
          vehicleRides: [],
          vehicleLeaves: [],
        },
        stats.name,
        {
          kills: stats.kills,
          assists: stats.assists,
          damageDealt: stats.damageDealt,
          DBNOs: stats.DBNOs,
        },
      ),
    ]);
  }
}
