import { SquadAnalysis, PlayerAnalysis, Insight } from '../types';
import { formatDuration, formatPercent, formatNumber, formatDate } from '../utils/formatters';

export class ContextBuilder {
  buildMarkdown(analysis: SquadAnalysis): string {
    const lines: string[] = [];

    lines.push('# PUBG Match Analysis Context');
    if (analysis.mapName) {
      lines.push(`**Map:** ${analysis.mapName}`);
    }
    lines.push(`**Players:** ${analysis.players.map(p => p.name).join(', ')}`);
    lines.push(`**Matches Analyzed:** ${analysis.matchesAnalyzed} (${formatDate(analysis.dateRange.start)} - ${formatDate(analysis.dateRange.end)})`);
    lines.push('**Platform:** Steam');
    lines.push('');

    // Squad summary
    lines.push('## Match Performance Summary');
    lines.push(`- Average Placement: #${formatNumber(analysis.squadStats.avgPlacement)}`);
    lines.push(`- Squad Kills: ${analysis.squadStats.totalKills} total (${formatNumber(analysis.squadStats.totalKills / analysis.matchesAnalyzed)} per match)`);
    lines.push(`- Squad Damage: ${Math.round(analysis.squadStats.avgDamage)} per match`);
    lines.push(`- Average Survival: ${formatDuration(analysis.squadStats.avgSurvivalTime)}`);
    lines.push('');

    // Individual performance
    lines.push('## Individual Performance');
    lines.push('');

    for (const player of analysis.players) {
      lines.push(`### ${player.name}`);
      lines.push('**Combat Stats:**');
      lines.push(`- K/D/A: ${formatNumber(player.avgStats.kills)} / ${formatNumber(player.avgStats.deaths)} / ${formatNumber(player.avgStats.assists)} (KDA: ${formatNumber(player.combat.combatScore.kda)})`);
      lines.push(`- Accuracy: ${formatPercent(player.aim.overallAccuracy)} overall`);
      lines.push(`- Best Weapon: ${player.aim.bestWeapon} (${formatPercent(player.aim.bestWeaponAccuracy)} accuracy)`);
      lines.push(`- Combat Grade: ${player.combat.combatScore.grade}`);
      lines.push('');

      lines.push('**Tactical Profile:**');
      lines.push(`- Zone positioning: ${formatNumber(player.tactics.zonePositioning.insideZonePercent)}% inside safe zone`);
      lines.push(`- Style: ${this.capitalizeStyle(player.tactics.movementStyle)}`);
      lines.push(`- Late rotations: ${player.tactics.zonePositioning.lateRotations}`);
      lines.push('');

      const strengths = this.identifyStrengths(player);
      const improvements = this.identifyImprovements(player);

      if (strengths.length > 0) {
        lines.push('**Strengths:**');
        for (const s of strengths) lines.push(`- ${s}`);
        lines.push('');
      }

      if (improvements.length > 0) {
        lines.push('**Areas for Improvement:**');
        for (const s of improvements) lines.push(`- ${s}`);
        lines.push('');
      }
    }

    // Squad weapon analysis
    if (analysis.players.length > 1) {
      lines.push('## Squad Analysis');
      lines.push('');
      lines.push('### Weapon Performance');
      lines.push('| Weapon | Squad Kills | Effectiveness |');
      lines.push('|--------|-------------|---------------|');

      const allWeapons = new Map<string, { kills: number; score: number }>();
      for (const player of analysis.players) {
        for (const [weapon, stats] of Object.entries(player.weapons.effectiveness)) {
          const existing = allWeapons.get(weapon) ?? { kills: 0, score: 0 };
          allWeapons.set(weapon, {
            kills: existing.kills + stats.kills,
            score: Math.max(existing.score, stats.effectivenessScore),
          });
        }
      }

      const sortedWeapons = [...allWeapons.entries()].sort((a, b) => b[1].kills - a[1].kills);
      for (const [weapon, stats] of sortedWeapons.slice(0, 6)) {
        const stars = this.getStarRating(stats.score);
        lines.push(`| ${weapon} | ${stats.kills} | ${stars} |`);
      }
      lines.push('');
    }

    // Insights
    if (analysis.insights.length > 0) {
      lines.push('## Key Insights & Recommendations');
      lines.push('');

      const byCategory = new Map<string, Insight[]>();
      for (const insight of analysis.insights) {
        const cat = insight.category;
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(insight);
      }

      for (const [category, insights] of byCategory) {
        lines.push(`### ${this.capitalizeCategory(category)}`);
        for (const insight of insights) {
          const severity = insight.severity === 'high' ? '**[HIGH]**' :
                          insight.severity === 'medium' ? '[MEDIUM]' : '[LOW]';
          lines.push(`- ${severity} **${insight.player}:** ${insight.message}`);
          lines.push(`  - Recommendation: ${insight.recommendation}`);
        }
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
    lines.push('**AI Assistant Prompt:**');
    lines.push('Based on this context, help these players:');
    lines.push('- Identify the most critical areas for improvement');
    lines.push('- Suggest specific drills or practice routines');
    lines.push('- Explain tactical adjustments for zone management');
    lines.push('- Recommend optimal weapon loadouts based on their playstyle');

    return lines.join('\n');
  }

  private capitalizeStyle(style: string): string {
    return style.charAt(0).toUpperCase() + style.slice(1);
  }

  private capitalizeCategory(category: string): string {
    const map: Record<string, string> = {
      aim: 'Aim Analysis',
      weapons: 'Weapon Analysis',
      tactics: 'Tactical Analysis',
      combat: 'Combat Analysis',
    };
    return map[category] ?? category;
  }

  private getStarRating(score: number): string {
    if (score >= 8) return '⭐⭐⭐⭐⭐ Excellent';
    if (score >= 5) return '⭐⭐⭐⭐ Good';
    if (score >= 3) return '⭐⭐⭐ Average';
    if (score >= 1.5) return '⭐⭐ Below Average';
    return '⭐ Poor';
  }

  private identifyStrengths(player: PlayerAnalysis): string[] {
    const strengths: string[] = [];

    if (player.aim.overallAccuracy >= 0.22) {
      strengths.push(`Strong accuracy (${formatPercent(player.aim.overallAccuracy)})`);
    }
    if (player.combat.damageRatio > 1.2) {
      strengths.push(`Good damage ratio (${formatNumber(player.combat.damageRatio)}x)`);
    }
    if (player.tactics.zonePositioning.insideZonePercent >= 70) {
      strengths.push('Good zone positioning');
    }
    if (player.combat.engagementWinRate >= 0.6) {
      strengths.push(`High fight win rate (${formatPercent(player.combat.engagementWinRate)})`);
    }
    if (player.combat.combatScore.grade === 'S' || player.combat.combatScore.grade === 'A') {
      strengths.push(`Excellent combat performance (Grade ${player.combat.combatScore.grade})`);
    }
    if (player.combat.engagementRanges.medium > 0.5) {
      strengths.push('Strong medium-range combat');
    }

    return strengths;
  }

  private identifyImprovements(player: PlayerAnalysis): string[] {
    const improvements: string[] = [];

    if (player.aim.overallAccuracy < 0.15) {
      improvements.push(`**Critical:** Accuracy very low (${formatPercent(player.aim.overallAccuracy)}) - practice recoil control`);
    } else if (player.aim.overallAccuracy < 0.20) {
      improvements.push(`Accuracy below threshold (${formatPercent(player.aim.overallAccuracy)})`);
    }

    if (player.tactics.zonePositioning.insideZonePercent < 60) {
      improvements.push('Zone positioning needs improvement (spend more time inside safe zone)');
    }

    if (player.tactics.zonePositioning.lateRotations >= 3) {
      improvements.push(`Late rotations (${player.tactics.zonePositioning.lateRotations} incidents) - rotate earlier`);
    }

    if (player.tactics.zonePositioning.edgePlayPercent > 40) {
      improvements.push(`High-risk edge play (${formatNumber(player.tactics.zonePositioning.edgePlayPercent)}% of time)`);
    }

    if (player.combat.damageRatio < 0.8) {
      improvements.push('Taking more damage than dealing - improve positioning');
    }

    if (player.combat.combatScore.grade === 'D' || player.combat.combatScore.grade === 'F') {
      improvements.push(`Low combat score (Grade ${player.combat.combatScore.grade}) - focus on fundamentals`);
    }

    return improvements;
  }
}
