import chalk from 'chalk';
import Table from 'cli-table3';
import { SquadAnalysis, PlayerAnalysis } from '../types';
import { formatDuration, formatPercent, formatNumber } from '../utils/formatters';

export class OutputRenderer {
  renderTable(analysis: SquadAnalysis): void {
    const players = analysis.players;

    // Header
    console.log('');
    console.log(chalk.cyan.bold('╔════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold(`║${this.center('PUBG Match Analysis', 64)}║`));
    if (analysis.mapName) {
      console.log(chalk.cyan.bold(`║${this.center(`Map: ${analysis.mapName}`, 64)}║`));
    }
    console.log(chalk.cyan.bold(`║${this.center(`Players: ${players.map(p => p.name).join(', ')}`, 64)}║`));
    console.log(chalk.cyan.bold(`║${this.center(`${analysis.matchesAnalyzed} Matches Analyzed`, 64)}║`));
    console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════════╝'));
    console.log('');

    // Performance summary table
    const headers = ['Metric', ...players.map(p => p.name)];
    if (players.length > 1) headers.push('Squad Avg');

    const table = new Table({
      head: headers.map(h => chalk.yellow.bold(h)),
      style: { head: [], border: [] },
    });

    const avgPlacement = players.map(p => p.avgStats.winPlace.toFixed(1));
    const avgKills = players.map(p => p.avgStats.kills.toFixed(1));
    const avgDamage = players.map(p => Math.round(p.avgStats.damageDealt).toString());
    const avgSurvival = players.map(p => formatDuration(p.avgStats.survivalTime));
    const accuracy = players.map(p => formatPercent(p.aim.overallAccuracy));
    const grade = players.map(p => this.colorGrade(p.combat.combatScore.grade));

    table.push(
      ['Avg Placement', ...avgPlacement, ...(players.length > 1 ? [this.squadAvg(players.map(p => p.avgStats.winPlace))] : [])],
      ['Avg Kills', ...avgKills, ...(players.length > 1 ? [this.squadAvg(players.map(p => p.avgStats.kills))] : [])],
      ['Damage/Match', ...avgDamage, ...(players.length > 1 ? [Math.round(analysis.squadStats.avgDamage / players.length).toString()] : [])],
      ['Survival Time', ...avgSurvival, ...(players.length > 1 ? [formatDuration(analysis.squadStats.avgSurvivalTime)] : [])],
      ['Accuracy', ...accuracy, ...(players.length > 1 ? [formatPercent(players.reduce((s, p) => s + p.aim.overallAccuracy, 0) / players.length)] : [])],
      ['Combat Grade', ...grade, ...(players.length > 1 ? [''] : [])],
    );

    console.log(table.toString());
    console.log('');

    // Aim analysis
    console.log(chalk.green.bold('🎯 AIM ANALYSIS'));
    for (const player of players) {
      const bestWeapon = player.aim.bestWeapon;
      const bestAcc = formatPercent(player.aim.bestWeaponAccuracy);
      const bestKills = player.aim.weaponBreakdown[bestWeapon]?.kills ?? 0;
      console.log(`  ${chalk.bold(player.name)} - Best Weapon: ${chalk.cyan(bestWeapon)} (${bestAcc} accuracy, ${bestKills} kills)`);
      console.log(`    Overall accuracy: ${formatPercent(player.aim.overallAccuracy)} | Headshot rate: ${formatPercent(player.aim.headshotRate)}`);
    }
    console.log('');

    // Weapon analysis
    console.log(chalk.red.bold('🔫 WEAPON CHOICES'));
    for (const player of players) {
      const rankings = player.weapons.rankings.slice(0, 3);
      if (rankings.length > 0) {
        const topWeapons = rankings.map(r => `${r.weapon}(${r.kills}k)`).join(', ');
        console.log(`  ${chalk.bold(player.name)} - Top weapons: ${chalk.cyan(topWeapons)}`);
        if (player.weapons.rankings.length > 0) {
          const best = player.weapons.rankings[0];
          if (best.recommendation === 'Keep using') {
            console.log(`    ${chalk.green('✓')} ${best.weapon}: Effective (score: ${best.effectivenessScore.toFixed(1)})`);
          }
          const worst = player.weapons.rankings[player.weapons.rankings.length - 1];
          if (worst.kills < 2 && worst.weapon !== best.weapon) {
            console.log(`    ${chalk.yellow('!')} ${worst.weapon}: Underperforming (${worst.kills} kills)`);
          }
        }
      }
    }
    console.log('');

    // Tactical analysis
    console.log(chalk.blue.bold('🗺️  TACTICAL ANALYSIS'));
    for (const player of players) {
      const zone = player.tactics.zonePositioning;
      const insideColor = zone.insideZonePercent >= 70 ? chalk.green : zone.insideZonePercent >= 60 ? chalk.yellow : chalk.red;
      const lateColor = zone.lateRotations <= 1 ? chalk.green : zone.lateRotations <= 2 ? chalk.yellow : chalk.red;

      console.log(`  ${chalk.bold(player.name)}`);
      console.log(`    Zone inside: ${insideColor(formatNumber(zone.insideZonePercent) + '%')} | Edge play: ${formatNumber(zone.edgePlayPercent)}% | Late rotations: ${lateColor(zone.lateRotations.toString())}`);
      console.log(`    Playstyle: ${chalk.cyan(player.tactics.movementStyle)} | Hot drop: ${formatPercent(player.tactics.hotDropFrequency)}`);
    }
    console.log('');

    // Combat analysis
    console.log(chalk.magenta.bold('⚔️  COMBAT EFFECTIVENESS'));
    for (const player of players) {
      const combat = player.combat;
      const ratioColor = combat.damageRatio > 1 ? chalk.green : combat.damageRatio > 0.8 ? chalk.yellow : chalk.red;
      const dominantRange = Object.entries(combat.engagementRanges).sort((a, b) => b[1] - a[1])[0];

      console.log(`  ${chalk.bold(player.name)}`);
      console.log(`    Damage ratio: ${ratioColor(formatNumber(combat.damageRatio) + 'x')} | KDA: ${formatNumber(combat.combatScore.kda)} | Grade: ${this.colorGrade(combat.combatScore.grade)}`);
      if (dominantRange) {
        console.log(`    Preferred range: ${chalk.cyan(dominantRange[0])} (${formatPercent(dominantRange[1])} of fights)`);
      }
    }
    console.log('');

    // Insights
    const highInsights = analysis.insights.filter(i => i.severity === 'high');
    const medInsights = analysis.insights.filter(i => i.severity === 'medium');

    if (highInsights.length > 0) {
      console.log(chalk.red.bold('🚨 CRITICAL ISSUES'));
      for (const insight of highInsights) {
        console.log(`  ${chalk.red('▶')} ${chalk.bold(insight.player)}: ${insight.message}`);
        console.log(`    ${chalk.yellow('→')} ${insight.recommendation}`);
      }
      console.log('');
    }

    if (medInsights.length > 0) {
      console.log(chalk.yellow.bold('⚠️  AREAS FOR IMPROVEMENT'));
      for (const insight of medInsights) {
        console.log(`  ${chalk.yellow('▶')} ${chalk.bold(insight.player)}: ${insight.message}`);
        console.log(`    ${chalk.gray('→')} ${insight.recommendation}`);
      }
      console.log('');
    }
  }

  renderVerbose(analysis: SquadAnalysis): void {
    this.renderTable(analysis);

    console.log(chalk.white.bold('═══════════════════ DETAILED WEAPON BREAKDOWN ═══════════════════'));
    for (const player of analysis.players) {
      console.log(`\n${chalk.bold.underline(player.name)}'s Weapon Performance:`);
      if (player.weapons.rankings.length === 0) {
        console.log('  No weapon data available');
        continue;
      }

      const weaponTable = new Table({
        head: ['Weapon', 'Kills', 'Damage', 'Accuracy', 'Avg Range', 'Score'].map(h => chalk.yellow(h)),
      });

      for (const w of player.weapons.rankings) {
        weaponTable.push([
          w.weapon,
          w.kills.toString(),
          Math.round(w.damage).toString(),
          formatPercent(w.accuracy),
          `${w.avgDistance.toFixed(0)}m`,
          w.effectivenessScore.toFixed(1),
        ]);
      }

      console.log(weaponTable.toString());
    }
    console.log('');
  }

  renderJSON(analysis: SquadAnalysis): void {
    console.log(JSON.stringify(analysis, null, 2));
  }

  private center(text: string, width: number): string {
    const padTotal = width - text.length;
    const padLeft = Math.floor(padTotal / 2);
    const padRight = padTotal - padLeft;
    return ' '.repeat(padLeft) + text + ' '.repeat(padRight);
  }

  private squadAvg(values: number[]): string {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return avg.toFixed(1);
  }

  private colorGrade(grade: string): string {
    switch (grade) {
      case 'S': return chalk.magenta.bold('S');
      case 'A': return chalk.green.bold('A');
      case 'B': return chalk.cyan.bold('B');
      case 'C': return chalk.yellow.bold('C');
      case 'D': return chalk.red.bold('D');
      case 'F': return chalk.red.bold('F');
      default: return grade;
    }
  }
}
