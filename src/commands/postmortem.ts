import chalk from "chalk";
import { resolveWeaponName } from "../constants/weapons";
import { AimAnalyzer } from "../lib/analytics/aim-analyzer";
import { CombatAnalyzer } from "../lib/analytics/combat-analyzer";
import { TacticalAnalyzer } from "../lib/analytics/tactical-analyzer";
import { WeaponAnalyzer } from "../lib/analytics/weapon-analyzer";
import { ApiClient } from "../lib/api-client";
import { ContextBuilder } from "../lib/context-builder";
import { InsightGenerator } from "../lib/insight-generator";
import { OutputRenderer } from "../lib/output-renderer";
import { MatchService } from "../lib/services/match-service";
import { PlayerService } from "../lib/services/player-service";
import type { FilteredTelemetry } from "../lib/services/telemetry-service";
import { TelemetryService } from "../lib/services/telemetry-service";
import {
  BodyPartDamage,
  ConsumableUsedEntry,
  DamageReceivedEntry,
  KillFeedEntry,
  PlayerAnalysis,
  PlayerMatchStats,
  ProcessedMatchData,
  SquadAnalysis,
} from "../types";
import { formatDate, formatDuration } from "../utils/formatters";
import {
  parsePlayerNames,
  validateMatchId,
  validatePlatform,
} from "../utils/validators";

const MIN_DURATION = 600; // 10 minutes in seconds

interface PostmortemCommandOptions {
  match?: string;
  today?: boolean;
  players: string;
  focus: "aim" | "weapons" | "tactics" | "combat" | "all";
  platform: string;
  output: "table" | "json" | "context";
}

function buildConsumablesUsed(
  telemetry: FilteredTelemetry,
): ConsumableUsedEntry[] {
  const byItem = new Map<string, { count: number; healamount: number }>();
  const norm = (id: string | undefined) => id?.trim() || "unknown";
  for (const e of telemetry.heals) {
    const id = norm(e.item?.itemId);
    const cur = byItem.get(id) ?? { count: 0, healamount: 0 };
    byItem.set(id, {
      count: cur.count + 1,
      healamount: cur.healamount + (e.healamount ?? 0),
    });
  }
  for (const e of telemetry.itemUses) {
    const id = norm(e.item?.itemId);
    const cur = byItem.get(id) ?? { count: 0, healamount: 0 };
    byItem.set(id, { count: cur.count + 1, healamount: cur.healamount });
  }
  return [...byItem.entries()].map(([itemId, v]) => ({
    itemId,
    count: v.count,
    ...(v.healamount > 0 ? { healamount: v.healamount } : {}),
  }));
}

function buildDamageReceived(
  telemetry: FilteredTelemetry,
  playerNameLower: string,
): DamageReceivedEntry[] {
  const byAttacker = new Map<string, { damage: number; hits: number }>();
  for (const e of telemetry.damageTaken) {
    if (e.victim?.name?.toLowerCase() !== playerNameLower) continue;
    const attacker = e.attacker?.name ?? "Unknown";
    const cur = byAttacker.get(attacker) ?? { damage: 0, hits: 0 };
    byAttacker.set(attacker, {
      damage: cur.damage + (e.damage ?? 0),
      hits: cur.hits + 1,
    });
  }
  return [...byAttacker.entries()]
    .map(([attacker, v]) => ({ attacker, damage: v.damage, hits: v.hits }))
    .sort((a, b) => b.damage - a.damage);
}

function buildBodyPartBreakdown(
  telemetry: FilteredTelemetry,
  playerNameLower: string,
): Record<string, BodyPartDamage> {
  const byReason = new Map<string, BodyPartDamage>();
  for (const e of telemetry.damageTaken) {
    if (e.victim?.name?.toLowerCase() !== playerNameLower) continue;
    const reason = e.damageReason ?? "Unknown";
    const cur = byReason.get(reason) ?? { damage: 0, hits: 0 };
    byReason.set(reason, {
      damage: cur.damage + (e.damage ?? 0),
      hits: cur.hits + 1,
    });
  }
  return Object.fromEntries(byReason);
}

function mergeConsumables(
  arrays: ConsumableUsedEntry[][],
): ConsumableUsedEntry[] {
  const byItem = new Map<string, { count: number; healamount: number }>();
  for (const arr of arrays) {
    for (const entry of arr) {
      const cur = byItem.get(entry.itemId) ?? { count: 0, healamount: 0 };
      byItem.set(entry.itemId, {
        count: cur.count + entry.count,
        healamount: cur.healamount + (entry.healamount ?? 0),
      });
    }
  }
  return [...byItem.entries()].map(([itemId, v]) => ({
    itemId,
    count: v.count,
    ...(v.healamount > 0 ? { healamount: v.healamount } : {}),
  }));
}

function mergeDamageReceived(
  arrays: DamageReceivedEntry[][],
): DamageReceivedEntry[] {
  const byAttacker = new Map<string, { damage: number; hits: number }>();
  for (const arr of arrays) {
    for (const entry of arr) {
      const cur = byAttacker.get(entry.attacker) ?? { damage: 0, hits: 0 };
      byAttacker.set(entry.attacker, {
        damage: cur.damage + entry.damage,
        hits: cur.hits + entry.hits,
      });
    }
  }
  return [...byAttacker.entries()]
    .map(([attacker, v]) => ({ attacker, damage: v.damage, hits: v.hits }))
    .sort((a, b) => b.damage - a.damage);
}

function mergeBodyPartBreakdown(
  arrays: Array<Record<string, BodyPartDamage>>,
): Record<string, BodyPartDamage> {
  const merged: Record<string, BodyPartDamage> = {};
  for (const rec of arrays) {
    for (const [reason, v] of Object.entries(rec)) {
      const cur = merged[reason] ?? { damage: 0, hits: 0 };
      merged[reason] = {
        damage: cur.damage + v.damage,
        hits: cur.hits + v.hits,
      };
    }
  }
  return merged;
}

export async function runPostmortem(
  api: ApiClient,
  opts: PostmortemCommandOptions,
): Promise<void> {
  const playerNames = parsePlayerNames(opts.players);
  if (playerNames.length === 0) {
    console.error(chalk.red("Error: No valid player names provided."));
    process.exit(1);
  }

  const platform = opts.platform.toLowerCase();
  if (!validatePlatform(platform)) {
    console.error(chalk.red(`Error: Invalid platform "${platform}".`));
    process.exit(1);
  }

  const matchService = new MatchService(api);
  const telemetryService = new TelemetryService(api);
  const playerService = new PlayerService(api);
  const aimAnalyzer = new AimAnalyzer();
  const weaponAnalyzer = new WeaponAnalyzer();
  const tacticalAnalyzer = new TacticalAnalyzer();
  const combatAnalyzer = new CombatAnalyzer();
  const insightGenerator = new InsightGenerator();

  let matchId = opts.match;
  const useToday = Boolean(opts.today && !opts.match);

  // --today: get all matches from current calendar day (local time), duration >= 10 min
  if (useToday) {
    try {
      console.log(
        chalk.gray(
          `Looking up today's matches for ${playerNames[0]} (calendar day, local time)...`,
        ),
      );
      const players = await playerService.getPlayersByName(
        [playerNames[0]],
        platform,
      );
      if (players.length === 0) {
        console.error(
          chalk.red(
            `Error: Player "${playerNames[0]}" not found on ${platform}.`,
          ),
        );
        process.exit(1);
      }
      const matchRefs = players[0].relationships.matches.data ?? [];
      if (matchRefs.length === 0) {
        console.error(
          chalk.red(`Error: No recent matches found for "${playerNames[0]}".`),
        );
        process.exit(1);
      }
      const todayMatches = await matchService.getMatchesForToday(
        matchRefs.map((m) => m.id),
        platform,
        MIN_DURATION,
      );
      if (todayMatches.length === 0) {
        console.error(
          chalk.red(
            `Error: No matches from today (local calendar day) with duration ≥ 10 min for "${playerNames[0]}".`,
          ),
        );
        process.exit(1);
      }
      const today = new Date();
      const dateLabel = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      console.log(
        chalk.gray(
          `Found ${todayMatches.length} match(es) from today (${dateLabel}).`,
        ),
      );
      await runPostmortemToday(
        api,
        opts,
        playerNames,
        platform,
        todayMatches,
        dateLabel,
        matchService,
        telemetryService,
        playerService,
        aimAnalyzer,
        weaponAnalyzer,
        tacticalAnalyzer,
        combatAnalyzer,
        insightGenerator,
      );
      return;
    } catch (err) {
      if (err instanceof Error) {
        console.error(
          chalk.red(`\n❌ Failed to look up today's matches: ${err.message}`),
        );
      }
      process.exit(1);
    }
  }

  // If no match ID provided (and not --today), look up the most recent match (>10 min) for the first player
  if (!matchId) {
    try {
      console.log(
        chalk.gray(
          `No match ID provided. Looking up most recent match for ${playerNames[0]}...`,
        ),
      );
      const players = await playerService.getPlayersByName(
        [playerNames[0]],
        platform,
      );
      if (players.length === 0) {
        console.error(
          chalk.red(
            `Error: Player "${playerNames[0]}" not found on ${platform}.`,
          ),
        );
        process.exit(1);
      }
      const recentMatches = players[0].relationships.matches.data;
      if (recentMatches.length === 0) {
        console.error(
          chalk.red(`Error: No recent matches found for "${playerNames[0]}".`),
        );
        process.exit(1);
      }

      const MAX_CANDIDATES = 10;
      for (const matchRef of recentMatches.slice(0, MAX_CANDIDATES)) {
        try {
          const candidate = await matchService.getMatch(matchRef.id, platform);
          if (candidate.duration >= MIN_DURATION) {
            matchId = matchRef.id;
            console.log(
              chalk.gray(
                `Using match ${matchId} (${formatDuration(candidate.duration)})`,
              ),
            );
            break;
          }
          console.log(
            chalk.gray(
              `  Skipping ${matchRef.id.slice(0, 8)}... (${formatDuration(candidate.duration)} - under 10 min)`,
            ),
          );
        } catch {
          continue;
        }
      }

      if (!matchId) {
        console.error(
          chalk.red(
            `Error: No recent match over 10 minutes found for "${playerNames[0]}" (checked ${Math.min(recentMatches.length, MAX_CANDIDATES)} matches).`,
          ),
        );
        process.exit(1);
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error(
          chalk.red(`\n❌ Failed to look up player: ${err.message}`),
        );
      }
      process.exit(1);
    }
  } else if (!validateMatchId(matchId)) {
    console.error(
      chalk.red(`Error: Invalid match ID format. Expected UUID format.`),
    );
    process.exit(1);
  }

  try {
    console.log(chalk.gray(`Fetching match ${matchId}...`));
    const match = await matchService.getMatch(matchId, platform);

    if (!matchService.isWithin14Days(match.createdAt)) {
      console.error(
        chalk.yellow(
          "⚠️  Warning: This match is older than 14 days. Telemetry may not be available.",
        ),
      );
    }

    const telemetryUrl = matchService.extractTelemetryUrl(match);
    if (!telemetryUrl) {
      console.error(chalk.red("❌ No telemetry URL found for this match."));
      process.exit(1);
    }

    console.log(chalk.gray("Downloading telemetry data..."));
    const allTelemetry = await telemetryService.fetchAndFilter(
      telemetryUrl,
      playerNames,
    );

    console.log(chalk.gray("Running analysis..."));

    const playerAnalyses = runSingleMatchAnalysis(
      match,
      playerNames,
      allTelemetry,
      telemetryService,
      aimAnalyzer,
      weaponAnalyzer,
      tacticalAnalyzer,
      combatAnalyzer,
    );

    if (playerAnalyses.length === 0) {
      console.error(
        chalk.red("None of the specified players were found in this match."),
      );
      process.exit(1);
    }

    const insights = insightGenerator.generate(playerAnalyses);

    const { getMapName } = await import("../constants/maps");

    const analysis: SquadAnalysis = {
      players: playerAnalyses,
      matchesAnalyzed: 1,
      dateRange: { start: match.createdAt, end: match.createdAt },
      insights,
      mapName: getMapName(match.mapName),
      reportMode: "single",
      squadStats: {
        avgPlacement:
          playerAnalyses.reduce((s, p) => s + p.avgStats.winPlace, 0) /
          playerAnalyses.length,
        totalKills: playerAnalyses.reduce((s, p) => s + p.avgStats.kills, 0),
        avgDamage: playerAnalyses.reduce(
          (s, p) => s + p.avgStats.damageDealt,
          0,
        ),
        avgSurvivalTime:
          playerAnalyses.reduce((s, p) => s + p.avgStats.survivalTime, 0) /
          playerAnalyses.length,
      },
    };

    if (opts.output !== "json") {
      console.log("");
      console.log(chalk.cyan.bold("═══════════════════════════════════════"));
      console.log(
        chalk.cyan.bold(
          `MATCH POST-MORTEM: Single match ${matchId.slice(0, 8)}...`,
        ),
      );
      console.log(
        `Map: ${chalk.bold(getMapName(match.mapName))} | Mode: ${chalk.bold(match.gameMode)}`,
      );
      console.log(
        `Date: ${formatDate(match.createdAt)} | Duration: ${formatDuration(match.duration)}`,
      );
      console.log(chalk.cyan.bold("═══════════════════════════════════════"));
    }

    if (opts.output === "json") {
      console.log(JSON.stringify(analysis, null, 2));
    } else if (opts.output === "context") {
      const builder = new ContextBuilder();
      console.log(builder.buildMarkdown(analysis));
    } else {
      const renderer = new OutputRenderer();
      renderer.renderTable(analysis);
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error(chalk.red(`\n❌ ${err.message}`));
    }
    process.exit(1);
  }
}

function runSingleMatchAnalysis(
  match: ProcessedMatchData,
  playerNames: string[],
  allTelemetry: FilteredTelemetry,
  telemetryService: TelemetryService,
  aimAnalyzer: AimAnalyzer,
  weaponAnalyzer: WeaponAnalyzer,
  tacticalAnalyzer: TacticalAnalyzer,
  combatAnalyzer: CombatAnalyzer,
): PlayerAnalysis[] {
  const playerAnalyses: PlayerAnalysis[] = [];

  for (const playerName of playerNames) {
    const participantStats = match.playerStats[playerName];
    if (!participantStats) continue;

    const playerTelemetry = telemetryService.getEventsForPlayer(
      allTelemetry,
      playerName,
    );

    const aim = aimAnalyzer.analyze(playerTelemetry, playerName);
    const weapons = weaponAnalyzer.analyze(
      playerTelemetry,
      playerName,
      aim.weaponBreakdown,
    );
    const tactics = tacticalAnalyzer.analyze(
      playerTelemetry,
      playerName,
      match.duration,
      participantStats,
    );
    const combat = combatAnalyzer.analyze(
      playerTelemetry,
      playerName,
      participantStats,
    );

    const killFeed: KillFeedEntry[] = [];
    for (const kill of playerTelemetry.kills) {
      if (kill.killer?.name?.toLowerCase() !== playerName.toLowerCase())
        continue;
      killFeed.push({
        victim: kill.victim?.name ?? "Unknown",
        weapon: resolveWeaponName(kill.killerDamageInfo?.damageCauserName),
        distance: (kill.killerDamageInfo?.distance ?? 0) / 100,
        timestamp: kill._D,
        headshot: kill.killerDamageInfo?.damageReason === "HeadShot",
      });
    }
    killFeed.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const nameLower = playerName.toLowerCase();
    const consumablesUsed = buildConsumablesUsed(playerTelemetry);
    const damageReceived = buildDamageReceived(playerTelemetry, nameLower);
    const bodyPartBreakdown = buildBodyPartBreakdown(
      playerTelemetry,
      nameLower,
    );

    const avgStats: PlayerMatchStats = {
      name: playerName,
      kills: participantStats.kills,
      deaths: participantStats.deathType === "alive" ? 0 : 1,
      assists: participantStats.assists,
      damageDealt: combat.damageDealt,
      damageTaken: combat.damageTaken,
      survivalTime: participantStats.timeSurvived,
      winPlace: participantStats.winPlace,
      headshotKills: participantStats.headshotKills,
      DBNOs: participantStats.DBNOs,
      revives: participantStats.revives,
      boosts: participantStats.boosts,
      heals: participantStats.heals,
      walkDistance: participantStats.walkDistance,
      rideDistance: participantStats.rideDistance,
    };

    playerAnalyses.push({
      name: playerName,
      matchesAnalyzed: 1,
      avgStats,
      aim,
      weapons,
      tactics,
      combat,
      killFeed,
      consumablesUsed,
      damageReceived,
      bodyPartBreakdown,
    });
  }

  return playerAnalyses;
}

async function runPostmortemToday(
  api: ApiClient,
  opts: PostmortemCommandOptions,
  playerNames: string[],
  platform: string,
  matches: ProcessedMatchData[],
  dateLabel: string,
  matchService: MatchService,
  telemetryService: TelemetryService,
  playerService: PlayerService,
  aimAnalyzer: AimAnalyzer,
  weaponAnalyzer: WeaponAnalyzer,
  tacticalAnalyzer: TacticalAnalyzer,
  combatAnalyzer: CombatAnalyzer,
  insightGenerator: InsightGenerator,
): Promise<void> {
  const { getMapName } = await import("../constants/maps");

  const perMatchAnalyses: PlayerAnalysis[][] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const telemetryUrl = matchService.extractTelemetryUrl(match);
    if (!telemetryUrl) {
      console.log(
        chalk.gray(
          `  Match ${match.matchId.slice(0, 8)}...: no telemetry, skipping.`,
        ),
      );
      continue;
    }
    console.log(
      chalk.gray(
        `  [${i + 1}/${matches.length}] Fetching telemetry for ${match.matchId.slice(0, 8)}...`,
      ),
    );
    try {
      const allTelemetry = await telemetryService.fetchAndFilter(
        telemetryUrl,
        playerNames,
      );
      const analyses = runSingleMatchAnalysis(
        match,
        playerNames,
        allTelemetry,
        telemetryService,
        aimAnalyzer,
        weaponAnalyzer,
        tacticalAnalyzer,
        combatAnalyzer,
      );
      perMatchAnalyses.push(analyses);
    } catch (err) {
      console.log(
        chalk.yellow(
          `  Warning: Could not fetch telemetry for match ${match.matchId.slice(0, 8)}...`,
        ),
      );
    }
  }

  if (perMatchAnalyses.length === 0) {
    console.error(chalk.red("No matches with telemetry could be analyzed."));
    process.exit(1);
  }

  // Aggregate per player across matches (by player name)
  const playerNamesFound = new Set<string>();
  for (const analyses of perMatchAnalyses) {
    for (const p of analyses) playerNamesFound.add(p.name);
  }
  const namesList = [...playerNamesFound];

  const aggregated: PlayerAnalysis[] = [];
  for (const playerName of namesList) {
    const perMatch = perMatchAnalyses
      .map((arr) => arr.find((p) => p.name === playerName))
      .filter((p): p is PlayerAnalysis => p != null);

    if (perMatch.length === 0) continue;

    const n = perMatch.length;
    const avgStats: PlayerMatchStats = {
      name: playerName,
      kills: perMatch.reduce((s, p) => s + p.avgStats.kills, 0) / n,
      deaths: 1,
      assists: perMatch.reduce((s, p) => s + p.avgStats.assists, 0) / n,
      damageDealt: perMatch.reduce((s, p) => s + p.avgStats.damageDealt, 0) / n,
      damageTaken: perMatch.reduce((s, p) => s + p.avgStats.damageTaken, 0) / n,
      survivalTime:
        perMatch.reduce((s, p) => s + p.avgStats.survivalTime, 0) / n,
      winPlace: perMatch.reduce((s, p) => s + p.avgStats.winPlace, 0) / n,
      headshotKills:
        perMatch.reduce((s, p) => s + p.avgStats.headshotKills, 0) / n,
      DBNOs: perMatch.reduce((s, p) => s + p.avgStats.DBNOs, 0) / n,
      revives: perMatch.reduce((s, p) => s + p.avgStats.revives, 0) / n,
      boosts: perMatch.reduce((s, p) => s + p.avgStats.boosts, 0) / n,
      heals: perMatch.reduce((s, p) => s + p.avgStats.heals, 0) / n,
      walkDistance:
        perMatch.reduce((s, p) => s + p.avgStats.walkDistance, 0) / n,
      rideDistance:
        perMatch.reduce((s, p) => s + p.avgStats.rideDistance, 0) / n,
    };

    const aggregatedAim = aimAnalyzer.aggregateAcrossMatches(
      perMatch.map((p) => p.aim),
    );
    const aggregatedWeapons =
      perMatch.length > 0 && perMatch[0].weapons.rankings.length > 0
        ? weaponAnalyzer.aggregateAcrossMatches(perMatch.map((p) => p.weapons))
        : { mostEffective: "N/A", effectiveness: {}, rankings: [] };
    const aggregatedTactics = tacticalAnalyzer.aggregateAcrossMatches(
      perMatch.map((p) => p.tactics),
    );
    const aggregatedCombat = combatAnalyzer.aggregateAcrossMatches(
      perMatch.map((p) => p.combat),
    );

    const killFeed: KillFeedEntry[] = perMatch.flatMap((p) => p.killFeed ?? []);
    killFeed.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const consumablesUsed = mergeConsumables(
      perMatch.map((p) => p.consumablesUsed ?? []),
    );
    const damageReceived = mergeDamageReceived(
      perMatch.map((p) => p.damageReceived ?? []),
    );
    const bodyPartBreakdown = mergeBodyPartBreakdown(
      perMatch.map((p) => p.bodyPartBreakdown ?? {}),
    );

    aggregated.push({
      name: playerName,
      matchesAnalyzed: n,
      avgStats,
      aim: aggregatedAim,
      weapons: aggregatedWeapons,
      tactics: aggregatedTactics,
      combat: aggregatedCombat,
      killFeed,
      consumablesUsed,
      damageReceived,
      bodyPartBreakdown,
    });
  }

  const insights = insightGenerator.generate(aggregated);
  const matchDates = matches.map((m) => new Date(m.createdAt).getTime());
  const dateRange = {
    start: new Date(Math.min(...matchDates)).toISOString(),
    end: new Date(Math.max(...matchDates)).toISOString(),
  };

  const analysis: SquadAnalysis = {
    players: aggregated,
    matchesAnalyzed: matches.length,
    dateRange,
    insights,
    reportMode: "today",
    squadStats: {
      avgPlacement:
        aggregated.reduce((s, p) => s + p.avgStats.winPlace, 0) /
        aggregated.length,
      totalKills: aggregated.reduce((s, p) => s + p.avgStats.kills, 0),
      avgDamage: aggregated.reduce((s, p) => s + p.avgStats.damageDealt, 0),
      avgSurvivalTime:
        aggregated.reduce((s, p) => s + p.avgStats.survivalTime, 0) /
        aggregated.length,
    },
  };

  if (opts.output !== "json") {
    console.log("");
    console.log(chalk.cyan.bold("═══════════════════════════════════════"));
    console.log(
      chalk.cyan.bold(
        `MATCH POST-MORTEM: Today's matches (${matches.length} game${matches.length === 1 ? "" : "s"}) — ${dateLabel}`,
      ),
    );
    console.log(
      `Matches from ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`,
    );
    console.log(chalk.cyan.bold("═══════════════════════════════════════"));
  }

  if (opts.output === "json") {
    console.log(JSON.stringify(analysis, null, 2));
  } else if (opts.output === "context") {
    const builder = new ContextBuilder();
    console.log(builder.buildMarkdown(analysis));
  } else {
    const renderer = new OutputRenderer();
    renderer.renderTable(analysis);
  }
}
