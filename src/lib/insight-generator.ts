import { PlayerAnalysis, Insight } from '../types';

export class InsightGenerator {
  generate(players: PlayerAnalysis[]): Insight[] {
    const insights: Insight[] = [];

    for (const player of players) {
      insights.push(...this.generateAimInsights(player));
      insights.push(...this.generateWeaponInsights(player));
      insights.push(...this.generateTacticalInsights(player));
      insights.push(...this.generateCombatInsights(player));
    }

    // Squad-level insights
    if (players.length > 1) {
      insights.push(...this.generateSquadInsights(players));
    }

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  private generateAimInsights(player: PlayerAnalysis): Insight[] {
    const insights: Insight[] = [];
    const acc = player.aim.overallAccuracy;

    if (acc < 0.10) {
      insights.push({
        category: 'aim',
        severity: 'high',
        player: player.name,
        message: `Accuracy critically low at ${(acc * 100).toFixed(1)}%`,
        recommendation: 'Practice in training mode, focus on burst-firing and crosshair placement',
      });
    } else if (acc < 0.15) {
      insights.push({
        category: 'aim',
        severity: 'medium',
        player: player.name,
        message: `Accuracy below minimum threshold at ${(acc * 100).toFixed(1)}%`,
        recommendation: 'Work on recoil control and pre-aiming common angles',
      });
    } else if (acc < 0.20) {
      insights.push({
        category: 'aim',
        severity: 'low',
        player: player.name,
        message: `Accuracy slightly below average at ${(acc * 100).toFixed(1)}%`,
        recommendation: 'Focus on trigger discipline - take fewer, more deliberate shots',
      });
    }

    if (player.aim.headshotRate > 0 && player.aim.headshotRate < 0.10) {
      insights.push({
        category: 'aim',
        severity: 'low',
        player: player.name,
        message: `Low headshot rate (${(player.aim.headshotRate * 100).toFixed(1)}%)`,
        recommendation: 'Practice crosshair placement at head level in training mode',
      });
    }

    return insights;
  }

  private generateWeaponInsights(player: PlayerAnalysis): Insight[] {
    const insights: Insight[] = [];
    const rankings = player.weapons.rankings;

    if (rankings.length === 0) return insights;

    // Find underperforming weapons (low effectiveness score but used frequently)
    const underperforming = rankings.filter(
      w => w.effectivenessScore < 2 && w.kills > 0
    );

    for (const weapon of underperforming) {
      insights.push({
        category: 'weapons',
        severity: 'low',
        player: player.name,
        message: `${weapon.weapon} underperforming (${weapon.kills} kills, low effectiveness)`,
        recommendation: `Consider alternatives to ${weapon.weapon} - check if better options are available`,
      });
    }

    // Check for lack of weapon diversity
    if (rankings.length === 1) {
      insights.push({
        category: 'weapons',
        severity: 'low',
        player: player.name,
        message: 'Limited weapon variety detected',
        recommendation: 'Try different weapons to find optimal loadout for your playstyle',
      });
    }

    return insights;
  }

  private generateTacticalInsights(player: PlayerAnalysis): Insight[] {
    const insights: Insight[] = [];
    const zone = player.tactics.zonePositioning;

    if (zone.lateRotations >= 3) {
      insights.push({
        category: 'tactics',
        severity: 'high',
        player: player.name,
        message: `${zone.lateRotations} late rotations detected across matches`,
        recommendation: 'Plan rotation 30-45 seconds before zone closes. Watch zone timer closely.',
      });
    } else if (zone.lateRotations >= 2) {
      insights.push({
        category: 'tactics',
        severity: 'medium',
        player: player.name,
        message: `${zone.lateRotations} late rotations detected`,
        recommendation: 'Improve zone awareness - rotate at least 30 seconds before zone edge reaches you',
      });
    }

    if (zone.insideZonePercent < 60) {
      insights.push({
        category: 'tactics',
        severity: 'high',
        player: player.name,
        message: `Only ${zone.insideZonePercent.toFixed(0)}% of time spent inside safe zone`,
        recommendation: 'Prioritize getting inside zone early. Zone damage is often the #1 cause of early death.',
      });
    } else if (zone.insideZonePercent < 70) {
      insights.push({
        category: 'tactics',
        severity: 'medium',
        player: player.name,
        message: `Zone positioning below optimal (${zone.insideZonePercent.toFixed(0)}% inside)`,
        recommendation: 'Aim for 75%+ time inside zone. Rotate proactively rather than reactively.',
      });
    }

    if (zone.edgePlayPercent > 40) {
      insights.push({
        category: 'tactics',
        severity: 'medium',
        player: player.name,
        message: `High edge play detected (${zone.edgePlayPercent.toFixed(0)}% of time on zone edge)`,
        recommendation: 'Reduce edge camping risk - you\'re vulnerable to zone pushes from behind',
      });
    }

    return insights;
  }

  private generateCombatInsights(player: PlayerAnalysis): Insight[] {
    const insights: Insight[] = [];
    const combat = player.combat;

    if (combat.damageRatio < 0.7) {
      insights.push({
        category: 'combat',
        severity: 'high',
        player: player.name,
        message: `Poor damage ratio (${combat.damageRatio.toFixed(2)}x) - taking much more damage than dealing`,
        recommendation: 'Improve positioning before engagements. Fight from cover, not in the open.',
      });
    }

    if (combat.engagementWinRate < 0.4 && combat.engagementWinRate > 0) {
      insights.push({
        category: 'combat',
        severity: 'medium',
        player: player.name,
        message: `Low fight win rate (${(combat.engagementWinRate * 100).toFixed(0)}%)`,
        recommendation: 'Be more selective about which fights to take. Disengage when outnumbered or at a disadvantage.',
      });
    }

    // Engagement range insight
    const dominantRange = Object.entries(combat.engagementRanges)
      .sort((a, b) => b[1] - a[1])[0];

    if (dominantRange && dominantRange[1] > 0.7) {
      const rangeMap: Record<string, string> = {
        close: 'close range (0-50m)',
        medium: 'medium range (50-150m)',
        long: 'long range (150-300m)',
        extreme: 'extreme range (300m+)',
      };
      insights.push({
        category: 'combat',
        severity: 'low',
        player: player.name,
        message: `Heavily favors ${rangeMap[dominantRange[0]] ?? dominantRange[0]} combat`,
        recommendation: 'Diversify engagement ranges to become a more versatile player',
      });
    }

    return insights;
  }

  private generateSquadInsights(players: PlayerAnalysis[]): Insight[] {
    const insights: Insight[] = [];

    const totalLateRotations = players.reduce(
      (sum, p) => sum + p.tactics.zonePositioning.lateRotations,
      0
    );

    if (totalLateRotations >= 5) {
      insights.push({
        category: 'tactics',
        severity: 'high',
        player: 'Squad',
        message: `Squad had ${totalLateRotations} late rotations total - systematic zone management issue`,
        recommendation: 'Designate a "zone caller" in the squad to track zone timing and call rotations',
      });
    }

    // Check if squad playstyles conflict
    const styles = players.map(p => p.tactics.movementStyle);
    const aggressive = styles.filter(s => s === 'aggressive').length;
    const passive = styles.filter(s => s === 'passive').length;

    if (aggressive > 0 && passive > 0) {
      insights.push({
        category: 'tactics',
        severity: 'medium',
        player: 'Squad',
        message: 'Mixed playstyles in squad (aggressive + passive players)',
        recommendation: 'Coordinate squad strategy - either commit to aggressive or passive playstyle together',
      });
    }

    return insights;
  }
}
