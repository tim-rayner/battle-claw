import chalk from 'chalk';
import { ApiClient } from '../lib/api-client';
import { MatchService } from '../lib/services/match-service';
import { TelemetryService } from '../lib/services/telemetry-service';
import { AimAnalyzer } from '../lib/analytics/aim-analyzer';
import { WeaponAnalyzer } from '../lib/analytics/weapon-analyzer';
import { TacticalAnalyzer } from '../lib/analytics/tactical-analyzer';
import { CombatAnalyzer } from '../lib/analytics/combat-analyzer';
import { InsightGenerator } from '../lib/insight-generator';
import { PlayerService } from '../lib/services/player-service';
import { OutputRenderer } from '../lib/output-renderer';
import { ContextBuilder } from '../lib/context-builder';
import { parsePlayerNames, validateMatchId, validatePlatform } from '../utils/validators';
import { formatDate, formatDuration } from '../utils/formatters';
import { PlayerAnalysis, PlayerMatchStats, SquadAnalysis } from '../types';

interface PostmortemCommandOptions {
  match?: string;
  players: string;
  focus: 'aim' | 'weapons' | 'tactics' | 'combat' | 'all';
  platform: string;
  output: 'table' | 'json' | 'context';
}

export async function runPostmortem(
  api: ApiClient,
  opts: PostmortemCommandOptions
): Promise<void> {
  const playerNames = parsePlayerNames(opts.players);
  if (playerNames.length === 0) {
    console.error(chalk.red('Error: No valid player names provided.'));
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

  // If no match ID provided, look up the most recent match (>10 min) for the first player
  if (!matchId) {
    try {
      console.log(chalk.gray(`No match ID provided. Looking up most recent match for ${playerNames[0]}...`));
      const players = await playerService.getPlayersByName([playerNames[0]], platform);
      if (players.length === 0) {
        console.error(chalk.red(`Error: Player "${playerNames[0]}" not found on ${platform}.`));
        process.exit(1);
      }
      const recentMatches = players[0].relationships.matches.data;
      if (recentMatches.length === 0) {
        console.error(chalk.red(`Error: No recent matches found for "${playerNames[0]}".`));
        process.exit(1);
      }

      // Find the most recent match that lasted at least 10 minutes
      const MIN_DURATION = 600; // 10 minutes in seconds
      const MAX_CANDIDATES = 10;
      for (const matchRef of recentMatches.slice(0, MAX_CANDIDATES)) {
        try {
          const candidate = await matchService.getMatch(matchRef.id, platform);
          if (candidate.duration >= MIN_DURATION) {
            matchId = matchRef.id;
            console.log(chalk.gray(`Using match ${matchId} (${formatDuration(candidate.duration)})`));
            break;
          }
          console.log(chalk.gray(`  Skipping ${matchRef.id.slice(0, 8)}... (${formatDuration(candidate.duration)} - under 10 min)`));
        } catch {
          // Skip matches that fail to fetch
          continue;
        }
      }

      if (!matchId) {
        console.error(chalk.red(`Error: No recent match over 10 minutes found for "${playerNames[0]}" (checked ${Math.min(recentMatches.length, MAX_CANDIDATES)} matches).`));
        process.exit(1);
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error(chalk.red(`\n❌ Failed to look up player: ${err.message}`));
      }
      process.exit(1);
    }
  } else if (!validateMatchId(matchId)) {
    console.error(chalk.red(`Error: Invalid match ID format. Expected UUID format.`));
    process.exit(1);
  }

  try {
    console.log(chalk.gray(`Fetching match ${matchId}...`));
    const match = await matchService.getMatch(matchId, platform);

    if (!matchService.isWithin14Days(match.createdAt)) {
      console.error(chalk.yellow('⚠️  Warning: This match is older than 14 days. Telemetry may not be available.'));
    }

    const telemetryUrl = matchService.extractTelemetryUrl(match);
    if (!telemetryUrl) {
      console.error(chalk.red('❌ No telemetry URL found for this match.'));
      process.exit(1);
    }

    console.log(chalk.gray('Downloading telemetry data...'));
    const allTelemetry = await telemetryService.fetchAndFilter(telemetryUrl, playerNames);

    console.log(chalk.gray('Running analysis...'));

    const playerAnalyses: PlayerAnalysis[] = [];

    for (const playerName of playerNames) {
      const participantStats = match.playerStats[playerName];
      if (!participantStats) {
        console.log(chalk.yellow(`  Player "${playerName}" not found in this match.`));
        continue;
      }

      const playerTelemetry = telemetryService.getEventsForPlayer(allTelemetry, playerName);

      const aim = aimAnalyzer.analyze(playerTelemetry, playerName);
      const weapons = weaponAnalyzer.analyze(playerTelemetry, playerName, aim.weaponBreakdown);
      const tactics = tacticalAnalyzer.analyze(playerTelemetry, playerName, match.duration);
      const combat = combatAnalyzer.analyze(playerTelemetry, playerName, participantStats);

      const avgStats: PlayerMatchStats = {
        name: playerName,
        kills: participantStats.kills,
        deaths: participantStats.deathType === 'alive' ? 0 : 1,
        assists: participantStats.assists,
        damageDealt: participantStats.damageDealt,
        damageTaken: 0,
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
      });
    }

    if (playerAnalyses.length === 0) {
      console.error(chalk.red('None of the specified players were found in this match.'));
      process.exit(1);
    }

    const insights = insightGenerator.generate(playerAnalyses);

    const { getMapName } = await import('../constants/maps');

    const analysis: SquadAnalysis = {
      players: playerAnalyses,
      matchesAnalyzed: 1,
      dateRange: { start: match.createdAt, end: match.createdAt },
      insights,
      mapName: getMapName(match.mapName),
      squadStats: {
        avgPlacement: playerAnalyses.reduce((s, p) => s + p.avgStats.winPlace, 0) / playerAnalyses.length,
        totalKills: playerAnalyses.reduce((s, p) => s + p.avgStats.kills, 0),
        avgDamage: playerAnalyses.reduce((s, p) => s + p.avgStats.damageDealt, 0),
        avgSurvivalTime: playerAnalyses.reduce((s, p) => s + p.avgStats.survivalTime, 0) / playerAnalyses.length,
      },
    };

    // Print match header
    if (opts.output !== 'json') {
      console.log('');
      console.log(chalk.cyan.bold('═══════════════════════════════════════'));
      console.log(chalk.cyan.bold(`MATCH POST-MORTEM: ${matchId.slice(0, 8)}...`));
      console.log(`Map: ${chalk.bold(getMapName(match.mapName))} | Mode: ${chalk.bold(match.gameMode)}`);
      console.log(`Date: ${formatDate(match.createdAt)} | Duration: ${formatDuration(match.duration)}`);
      console.log(chalk.cyan.bold('═══════════════════════════════════════'));
    }

    if (opts.output === 'json') {
      console.log(JSON.stringify(analysis, null, 2));
    } else if (opts.output === 'context') {
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
