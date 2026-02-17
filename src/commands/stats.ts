import chalk from 'chalk';
import Table from 'cli-table3';
import { ApiClient } from '../lib/api-client';
import { PlayerService } from '../lib/services/player-service';
import { parsePlayerNames, validatePlatform } from '../utils/validators';
import { formatDuration, formatPercent, formatNumber } from '../utils/formatters';

interface StatsCommandOptions {
  players: string;
  season: string;
  compare: boolean;
  platform: string;
  output: 'table' | 'json';
}

export async function runStats(
  api: ApiClient,
  opts: StatsCommandOptions
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

  const playerService = new PlayerService(api);

  try {
    console.log(chalk.gray('Fetching player data...'));
    const players = await playerService.getPlayersByName(playerNames, platform);

    if (players.length === 0) {
      console.error(chalk.red(`No players found.`));
      process.exit(1);
    }

    // Resolve season ID
    let seasonId = opts.season;
    if (seasonId === 'current') {
      console.log(chalk.gray('Fetching current season...'));
      seasonId = await playerService.getCurrentSeason(platform);
    }

    // Fetch season stats for each player
    const statsResults = await Promise.all(
      players.map(async player => {
        const accountId = player.id;
        const name = player.attributes.name;
        console.log(chalk.gray(`  Fetching stats for ${name}...`));

        if (seasonId === 'lifetime') {
          // Lifetime stats use a different endpoint
          return { name, accountId, stats: null, isLifetime: true };
        }

        try {
          const stats = await playerService.getSeasonStats(accountId, seasonId, platform);
          return { name, accountId, stats, isLifetime: false };
        } catch {
          return { name, accountId, stats: null, isLifetime: false };
        }
      })
    );

    if (opts.output === 'json') {
      console.log(JSON.stringify(statsResults, null, 2));
      return;
    }

    // Render stats table
    console.log('');
    console.log(chalk.cyan.bold(`Season Stats: ${seasonId}`));
    console.log('');

    for (const result of statsResults) {
      if (!result.stats) {
        console.log(chalk.yellow(`  ${result.name}: No stats available for this season`));
        continue;
      }

      const data = result.stats as Record<string, unknown>;
      const attributes = (data as Record<string, Record<string, unknown>>).data?.attributes;
      if (!attributes) {
        console.log(chalk.yellow(`  ${result.name}: Stats format not recognized`));
        continue;
      }

      const gameModeStats = (attributes as Record<string, unknown>).gameModeStats as Record<string, unknown> ?? {};

      console.log(chalk.bold.underline(`${result.name}`));

      const table = new Table({
        head: ['Mode', 'Matches', 'Wins', 'Kills', 'K/D', 'Damage/Match', 'Win Rate'].map(h => chalk.yellow(h)),
      });

      for (const [mode, modeData] of Object.entries(gameModeStats)) {
        if (!modeData || typeof modeData !== 'object') continue;
        const s = modeData as Record<string, number>;

        const matches = s.roundsPlayed ?? 0;
        if (matches === 0) continue;

        const wins = s.wins ?? 0;
        const kills = s.kills ?? 0;
        const deaths = s.losses ?? matches;
        const damage = s.damageDealt ?? 0;
        const kd = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);
        const winRate = formatPercent(wins / matches);
        const dmgPerMatch = Math.round(damage / matches);

        table.push([
          mode.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()),
          matches.toString(),
          wins.toString(),
          kills.toString(),
          kd,
          dmgPerMatch.toString(),
          winRate,
        ]);
      }

      console.log(table.toString());
      console.log('');
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error(chalk.red(`\n❌ ${err.message}`));
    }
    process.exit(1);
  }
}
