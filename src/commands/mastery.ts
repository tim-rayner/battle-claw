import chalk from 'chalk';
import Table from 'cli-table3';
import { ApiClient } from '../lib/api-client';
import { PlayerService } from '../lib/services/player-service';
import { sanitizePlayerName, validatePlatform } from '../utils/validators';
import { getWeaponName } from '../constants/weapons';
import { formatPercent } from '../utils/formatters';

interface MasteryCommandOptions {
  player: string;
  weapon?: string;
  top: number;
  platform: string;
  output: 'table' | 'json';
}

interface WeaponMasteryStats {
  weaponId: string;
  kills: number;
  headshotKills: number;
  damageDealt: number;
  longestKill: number;
  roundsPlayed: number;
}

export async function runMastery(
  api: ApiClient,
  opts: MasteryCommandOptions
): Promise<void> {
  const playerName = sanitizePlayerName(opts.player.trim());
  if (!playerName) {
    console.error(chalk.red('Error: No valid player name provided.'));
    process.exit(1);
  }

  const platform = opts.platform.toLowerCase();
  if (!validatePlatform(platform)) {
    console.error(chalk.red(`Error: Invalid platform "${platform}".`));
    process.exit(1);
  }

  const playerService = new PlayerService(api);

  try {
    console.log(chalk.gray(`Fetching player data for ${playerName}...`));
    const players = await playerService.getPlayersByName([playerName], platform);

    if (players.length === 0) {
      console.error(chalk.red(`Player "${playerName}" not found.`));
      process.exit(1);
    }

    const player = players[0];
    const accountId = player.id;

    console.log(chalk.gray(`Fetching weapon mastery for ${player.attributes.name}...`));
    const masteryData = await playerService.getWeaponMastery(accountId, platform);

    if (opts.output === 'json') {
      console.log(JSON.stringify(masteryData, null, 2));
      return;
    }

    const data = masteryData as Record<string, unknown>;
    const attributes = (data as Record<string, Record<string, unknown>>).data?.attributes;
    if (!attributes) {
      console.log(chalk.yellow('Weapon mastery data not available for this player.'));
      return;
    }

    const weaponsData = (attributes as Record<string, unknown>).weaponSummaries as Record<string, WeaponMasteryStats> ?? {};

    let weapons = Object.entries(weaponsData)
      .map(([id, stats]) => ({
        name: getWeaponName(id),
        rawId: id,
        kills: stats.kills ?? 0,
        headshotKills: stats.headshotKills ?? 0,
        damageDealt: stats.damageDealt ?? 0,
        longestKill: (stats.longestKill ?? 0) / 100, // cm to meters
        headshotRate: stats.kills > 0 ? (stats.headshotKills ?? 0) / stats.kills : 0,
      }))
      .filter(w => w.kills > 0)
      .sort((a, b) => b.kills - a.kills);

    // Filter by weapon name if specified
    if (opts.weapon) {
      const filterLower = opts.weapon.toLowerCase();
      weapons = weapons.filter(
        w => w.name.toLowerCase().includes(filterLower) ||
             w.rawId.toLowerCase().includes(filterLower)
      );
    }

    // Limit to top N
    weapons = weapons.slice(0, opts.top);

    console.log('');
    console.log(chalk.cyan.bold(`Weapon Mastery: ${player.attributes.name}`));
    console.log('');

    if (weapons.length === 0) {
      console.log(chalk.yellow('No weapon mastery data found.'));
      return;
    }

    const table = new Table({
      head: ['Weapon', 'Kills', 'Headshots', 'HS Rate', 'Longest Kill', 'Total Damage'].map(h => chalk.yellow(h)),
    });

    for (const w of weapons) {
      table.push([
        chalk.bold(w.name),
        w.kills.toString(),
        w.headshotKills.toString(),
        formatPercent(w.headshotRate),
        `${w.longestKill.toFixed(0)}m`,
        Math.round(w.damageDealt).toLocaleString(),
      ]);
    }

    console.log(table.toString());
    console.log('');
  } catch (err) {
    if (err instanceof Error) {
      console.error(chalk.red(`\n❌ ${err.message}`));
    }
    process.exit(1);
  }
}
