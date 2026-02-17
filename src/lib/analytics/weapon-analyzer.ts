import { FilteredTelemetry } from '../services/telemetry-service';
import { WeaponAnalysis, WeaponEffectiveness } from '../../types';
import { getWeaponName } from '../../constants/weapons';

export class WeaponAnalyzer {
  analyze(telemetry: FilteredTelemetry, playerName: string, aimAccuracy: Record<string, { accuracy: number }>): WeaponAnalysis {
    const nameLower = playerName.toLowerCase();
    const weapons: Record<string, {
      kills: number;
      damage: number;
      distances: number[];
    }> = {};

    // Track kills per weapon
    for (const kill of telemetry.kills) {
      if (kill.killer?.name?.toLowerCase() !== nameLower) continue;
      const weaponRaw = kill.killerDamageInfo?.causerName ?? 'Unknown';
      const weapon = this.normalizeWeaponName(weaponRaw);

      if (!weapons[weapon]) {
        weapons[weapon] = { kills: 0, damage: 0, distances: [] };
      }
      weapons[weapon].kills += 1;
      if (kill.killerDamageInfo?.distance) {
        weapons[weapon].distances.push(kill.killerDamageInfo.distance / 100); // Convert to meters
      }
    }

    // Track damage dealt per weapon from attacker's damage events
    for (const dmg of telemetry.damageDealtEvents) {
      if (dmg.attacker?.name?.toLowerCase() !== nameLower) continue;
      const weaponRaw = dmg.damageCauserName ?? 'Unknown';
      const weapon = this.normalizeWeaponName(weaponRaw);

      if (!weapons[weapon]) {
        weapons[weapon] = { kills: 0, damage: 0, distances: [] };
      }
      weapons[weapon].damage += dmg.damage;
    }

    const effectiveness: Record<string, WeaponEffectiveness> = {};
    const rankings: WeaponEffectiveness[] = [];

    for (const [weapon, stats] of Object.entries(weapons)) {
      const avgDistance = stats.distances.length > 0
        ? stats.distances.reduce((a, b) => a + b, 0) / stats.distances.length
        : 0;

      const acc = aimAccuracy[weapon]?.accuracy ?? 0;
      const damagePerKill = stats.kills > 0 ? stats.damage / stats.kills : 0;

      // Effectiveness score: kills (40%), damage per kill (30%), accuracy (30%)
      const effectivenessScore =
        stats.kills * 0.4 +
        (damagePerKill / 100) * 0.3 +
        acc * 100 * 0.3;

      const entry: WeaponEffectiveness = {
        weapon,
        kills: stats.kills,
        damage: stats.damage,
        avgDistance,
        accuracy: acc,
        effectivenessScore,
        recommendation: effectivenessScore > 5 ? 'Keep using' : 'Consider alternatives',
      };

      effectiveness[weapon] = entry;
      rankings.push(entry);
    }

    rankings.sort((a, b) => b.effectivenessScore - a.effectivenessScore);

    const mostEffective = rankings[0]?.weapon ?? 'N/A';

    return {
      mostEffective,
      effectiveness,
      rankings,
    };
  }

  private normalizeWeaponName(raw: string): string {
    // Try to get clean name from weapon ID mapping
    const fromId = getWeaponName(raw);
    if (fromId !== raw) return fromId;

    // Clean up common patterns from causerName
    return raw
      .replace(/^Item_Weapon_/, '')
      .replace(/_C$/, '')
      .replace(/_/g, ' ')
      .trim();
  }

  aggregateAcrossMatches(analyses: WeaponAnalysis[]): WeaponAnalysis {
    if (analyses.length === 0) {
      return { mostEffective: 'N/A', effectiveness: {}, rankings: [] };
    }

    const aggWeapons: Record<string, {
      kills: number;
      damage: number;
      distances: number[];
      accuracySum: number;
      accuracyCount: number;
    }> = {};

    for (const analysis of analyses) {
      for (const [weapon, stats] of Object.entries(analysis.effectiveness)) {
        if (!aggWeapons[weapon]) {
          aggWeapons[weapon] = { kills: 0, damage: 0, distances: [], accuracySum: 0, accuracyCount: 0 };
        }
        aggWeapons[weapon].kills += stats.kills;
        aggWeapons[weapon].damage += stats.damage;
        if (stats.avgDistance > 0) {
          aggWeapons[weapon].distances.push(stats.avgDistance);
        }
        if (stats.accuracy > 0) {
          aggWeapons[weapon].accuracySum += stats.accuracy;
          aggWeapons[weapon].accuracyCount += 1;
        }
      }
    }

    const effectiveness: Record<string, WeaponEffectiveness> = {};
    const rankings: WeaponEffectiveness[] = [];

    for (const [weapon, stats] of Object.entries(aggWeapons)) {
      const avgDistance = stats.distances.length > 0
        ? stats.distances.reduce((a, b) => a + b, 0) / stats.distances.length
        : 0;
      const acc = stats.accuracyCount > 0 ? stats.accuracySum / stats.accuracyCount : 0;
      const damagePerKill = stats.kills > 0 ? stats.damage / stats.kills : 0;

      const effectivenessScore =
        stats.kills * 0.4 +
        (damagePerKill / 100) * 0.3 +
        acc * 100 * 0.3;

      const entry: WeaponEffectiveness = {
        weapon,
        kills: stats.kills,
        damage: stats.damage,
        avgDistance,
        accuracy: acc,
        effectivenessScore,
        recommendation: effectivenessScore > 5 ? 'Keep using' : 'Consider alternatives',
      };
      effectiveness[weapon] = entry;
      rankings.push(entry);
    }

    rankings.sort((a, b) => b.effectivenessScore - a.effectivenessScore);
    const mostEffective = rankings[0]?.weapon ?? 'N/A';

    return { mostEffective, effectiveness, rankings };
  }
}
