import { PUNCH_WEAPON_NAME, resolveWeaponName } from "../../constants/weapons";
import { AimAnalysis, WeaponAccuracy } from "../../types";
import { FilteredTelemetry } from "../services/telemetry-service";

export class AimAnalyzer {
  analyze(telemetry: FilteredTelemetry, playerName: string): AimAnalysis {
    const nameLower = playerName.toLowerCase();
    const weaponStats: Record<
      string,
      { hits: number; shots: number; kills: number; headshotKills: number }
    > = {};

    // Count shots fired per weapon (LogWeaponFireCount)
    for (const event of telemetry.fireCountEvents) {
      if (event.character?.name?.toLowerCase() !== nameLower) continue;
      const weapon = resolveWeaponName(event.weaponId);
      if (weapon === "Unknown") continue;
      if (!weaponStats[weapon]) {
        weaponStats[weapon] = { hits: 0, shots: 0, kills: 0, headshotKills: 0 };
      }
      weaponStats[weapon].shots += event.fireCount;
    }

    // Count hits per weapon from damage dealt events (LogPlayerTakeDamage where player is attacker)
    // Each Damage_Gun event represents a bullet that landed on an opponent
    for (const event of telemetry.damageDealtEvents) {
      if (event.attacker?.name?.toLowerCase() !== nameLower) continue;
      if (event.damageTypeCategory !== "Damage_Gun") continue;
      const weapon = resolveWeaponName(event.damageCauserName);
      if (weapon === "Unknown") continue;
      // Punch/fist is default; only record when damage > 0
      if (weapon === PUNCH_WEAPON_NAME && event.damage <= 0) continue;
      if (!weaponStats[weapon]) {
        weaponStats[weapon] = { hits: 0, shots: 0, kills: 0, headshotKills: 0 };
      }
      weaponStats[weapon].hits += 1;
    }

    // Fallback: count shots from LogPlayerAttack when no LogWeaponFireCount data exists
    const attackCounts: Record<string, number> = {};
    for (const event of telemetry.attacks) {
      if (event.attacker?.name?.toLowerCase() !== nameLower) continue;
      if (event.attackType !== "Weapon") continue;
      const weapon = resolveWeaponName(event.weapon?.itemId);
      if (weapon === "Unknown") continue;
      attackCounts[weapon] = (attackCounts[weapon] || 0) + 1;
    }
    for (const [weapon, count] of Object.entries(attackCounts)) {
      if (!weaponStats[weapon]) {
        weaponStats[weapon] = { hits: 0, shots: 0, kills: 0, headshotKills: 0 };
      }
      if (weaponStats[weapon].shots === 0) {
        weaponStats[weapon].shots = count;
      }
    }

    // Count kills and headshot kills
    for (const event of telemetry.kills) {
      if (event.killer?.name?.toLowerCase() !== nameLower) continue;
      const weapon = resolveWeaponName(
        event.killerDamageInfo?.damageCauserName,
      );
      if (weapon === "Unknown") continue;

      if (!weaponStats[weapon]) {
        weaponStats[weapon] = { hits: 0, shots: 0, kills: 0, headshotKills: 0 };
      }
      weaponStats[weapon].kills += 1;

      if (event.killerDamageInfo?.damageReason === "HeadShot") {
        weaponStats[weapon].headshotKills += 1;
      }
    }

    // Calculate accuracy per weapon (exclude 'Unknown' entries)
    const weaponBreakdown: Record<string, WeaponAccuracy> = {};
    let totalHits = 0;
    let totalShots = 0;
    let totalKills = 0;
    let totalHeadshotKills = 0;

    for (const [weapon, stats] of Object.entries(weaponStats)) {
      if (weapon === "Unknown") continue;
      // Exclude Punch when no hits and no kills (default only)
      if (
        weapon === PUNCH_WEAPON_NAME &&
        stats.hits <= 0 &&
        (stats.kills ?? 0) <= 0
      )
        continue;
      const accuracy = stats.shots > 0 ? stats.hits / stats.shots : 0;
      weaponBreakdown[weapon] = {
        accuracy,
        hits: stats.hits,
        shots: stats.shots,
        kills: stats.kills,
        headshotKills: stats.headshotKills,
      };
      totalHits += stats.hits;
      totalShots += stats.shots;
      totalKills += stats.kills;
      totalHeadshotKills += stats.headshotKills;
    }

    const overallAccuracy = totalShots > 0 ? totalHits / totalShots : 0;
    const headshotRate = totalKills > 0 ? totalHeadshotKills / totalKills : 0;

    // Find best weapon by kills (with tie-break on accuracy)
    let bestWeapon = "N/A";
    let bestWeaponAccuracy = 0;
    let bestKills = -1;

    for (const [weapon, stats] of Object.entries(weaponBreakdown)) {
      if (
        (stats.kills ?? 0) > bestKills ||
        ((stats.kills ?? 0) === bestKills &&
          stats.accuracy > bestWeaponAccuracy)
      ) {
        bestWeapon = weapon;
        bestWeaponAccuracy = stats.accuracy;
        bestKills = stats.kills ?? 0;
      }
    }

    return {
      overallAccuracy,
      weaponBreakdown,
      headshotRate,
      bestWeapon,
      bestWeaponAccuracy,
    };
  }

  aggregateAcrossMatches(analyses: AimAnalysis[]): AimAnalysis {
    if (analyses.length === 0) {
      return {
        overallAccuracy: 0,
        weaponBreakdown: {},
        headshotRate: 0,
        bestWeapon: "N/A",
        bestWeaponAccuracy: 0,
      };
    }

    // Aggregate weapon stats across matches
    const aggWeapons: Record<
      string,
      { hits: number; shots: number; kills: number; headshotKills: number }
    > = {};
    let totalAccuracySum = 0;
    let totalHeadshotSum = 0;

    for (const analysis of analyses) {
      totalAccuracySum += analysis.overallAccuracy;
      totalHeadshotSum += analysis.headshotRate;

      for (const [weapon, stats] of Object.entries(analysis.weaponBreakdown)) {
        if (weapon === "Unknown") continue;
        if (
          weapon === PUNCH_WEAPON_NAME &&
          (stats.hits ?? 0) <= 0 &&
          (stats.kills ?? 0) <= 0
        )
          continue;
        if (!aggWeapons[weapon]) {
          aggWeapons[weapon] = {
            hits: 0,
            shots: 0,
            kills: 0,
            headshotKills: 0,
          };
        }
        aggWeapons[weapon].hits += stats.hits;
        aggWeapons[weapon].shots += stats.shots;
        aggWeapons[weapon].kills += stats.kills ?? 0;
        aggWeapons[weapon].headshotKills += stats.headshotKills ?? 0;
      }
    }

    const weaponBreakdown: Record<string, WeaponAccuracy> = {};
    let bestWeapon = "N/A";
    let bestWeaponAccuracy = 0;
    let bestKills = -1;

    for (const [weapon, stats] of Object.entries(aggWeapons)) {
      if (weapon === PUNCH_WEAPON_NAME && stats.hits <= 0 && stats.kills <= 0)
        continue;
      const accuracy = stats.shots > 0 ? stats.hits / stats.shots : 0;
      weaponBreakdown[weapon] = {
        accuracy,
        hits: stats.hits,
        shots: stats.shots,
        kills: stats.kills,
        headshotKills: stats.headshotKills,
      };

      if (
        stats.kills > bestKills ||
        (stats.kills === bestKills && accuracy > bestWeaponAccuracy)
      ) {
        bestWeapon = weapon;
        bestWeaponAccuracy = accuracy;
        bestKills = stats.kills;
      }
    }

    return {
      overallAccuracy: totalAccuracySum / analyses.length,
      weaponBreakdown,
      headshotRate: totalHeadshotSum / analyses.length,
      bestWeapon,
      bestWeaponAccuracy,
    };
  }
}
