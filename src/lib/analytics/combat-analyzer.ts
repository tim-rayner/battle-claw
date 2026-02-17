import { FilteredTelemetry } from '../services/telemetry-service';
import { CombatAnalysis, CombatEffectivenessScore, EngagementRanges } from '../../types';

interface BasicStats {
  kills: number;
  assists: number;
  damageDealt: number;
  DBNOs: number;
}

function getGrade(score: number): CombatEffectivenessScore['grade'] {
  if (score >= 5) return 'S';
  if (score >= 3.5) return 'A';
  if (score >= 2.5) return 'B';
  if (score >= 1.5) return 'C';
  if (score >= 0.8) return 'D';
  return 'F';
}

function calculateCombatScore(
  kills: number,
  deaths: number,
  assists: number,
  damageDealt: number,
  damageTaken: number
): CombatEffectivenessScore {
  const kda = deaths > 0 ? (kills + assists * 0.5) / deaths : kills + assists * 0.5;
  const damageRatio = damageTaken > 0 ? damageDealt / damageTaken : damageDealt > 0 ? 2 : 1;

  // Weighted score: 40% KDA, 40% damage ratio, 20% raw kills
  const score = kda * 0.4 + damageRatio * 0.4 + kills * 0.2;

  return {
    score,
    kda,
    damageRatio,
    grade: getGrade(score),
  };
}

export class CombatAnalyzer {
  analyze(
    telemetry: FilteredTelemetry,
    playerName: string,
    participantStats: BasicStats
  ): CombatAnalysis {
    const nameLower = playerName.toLowerCase();

    // Use participant stats for overall damage dealt
    const damageDealt = participantStats.damageDealt;
    const kills = participantStats.kills;
    const assists = participantStats.assists;

    // Calculate damage taken from telemetry
    let damageTaken = 0;
    for (const event of telemetry.damageTaken) {
      if (event.victim?.name?.toLowerCase() === nameLower) {
        damageTaken += event.damage;
      }
    }

    // If no telemetry, use a rough estimate (DBNOs * 100 + some base)
    if (damageTaken === 0 && (participantStats.DBNOs > 0 || kills > 0)) {
      damageTaken = damageDealt * 0.7; // Rough fallback
    }

    // Calculate engagement ranges from kill distances
    const ranges: { close: number; medium: number; long: number; extreme: number } = {
      close: 0, medium: 0, long: 0, extreme: 0,
    };
    let totalEngagements = 0;

    for (const kill of telemetry.kills) {
      if (kill.killer?.name?.toLowerCase() !== nameLower) continue;
      const distanceM = (kill.killerDamageInfo?.distance ?? 0) / 100; // cm to meters

      if (distanceM <= 50) ranges.close++;
      else if (distanceM <= 150) ranges.medium++;
      else if (distanceM <= 300) ranges.long++;
      else ranges.extreme++;

      totalEngagements++;
    }

    const engagementRanges: EngagementRanges = {
      close: totalEngagements > 0 ? ranges.close / totalEngagements : 0,
      medium: totalEngagements > 0 ? ranges.medium / totalEngagements : 0,
      long: totalEngagements > 0 ? ranges.long / totalEngagements : 0,
      extreme: totalEngagements > 0 ? ranges.extreme / totalEngagements : 0,
    };

    // Engagement win rate: kills / (kills + deaths approximation)
    // We use kills vs times downed (DBNOs) as proxy
    const totalFights = kills + participantStats.DBNOs;
    const engagementWinRate = totalFights > 0 ? kills / totalFights : 0;

    const combatScore = calculateCombatScore(
      kills,
      1, // We treat each match as 1 death (player died or survived)
      assists,
      damageDealt,
      damageTaken
    );

    return {
      damageDealt,
      damageTaken,
      damageRatio: damageTaken > 0 ? damageDealt / damageTaken : damageDealt > 0 ? 2 : 1,
      engagementRanges,
      engagementWinRate,
      combatScore,
    };
  }

  aggregateAcrossMatches(analyses: CombatAnalysis[]): CombatAnalysis {
    if (analyses.length === 0) {
      return {
        damageDealt: 0,
        damageTaken: 0,
        damageRatio: 1,
        engagementRanges: { close: 0, medium: 0, long: 0, extreme: 0 },
        engagementWinRate: 0,
        combatScore: { score: 0, kda: 0, damageRatio: 1, grade: 'F' },
      };
    }

    const n = analyses.length;
    const totalDamageDealt = analyses.reduce((s, a) => s + a.damageDealt, 0);
    const totalDamageTaken = analyses.reduce((s, a) => s + a.damageTaken, 0);

    const avgEngagementRanges: EngagementRanges = {
      close: analyses.reduce((s, a) => s + a.engagementRanges.close, 0) / n,
      medium: analyses.reduce((s, a) => s + a.engagementRanges.medium, 0) / n,
      long: analyses.reduce((s, a) => s + a.engagementRanges.long, 0) / n,
      extreme: analyses.reduce((s, a) => s + a.engagementRanges.extreme, 0) / n,
    };

    const avgKda = analyses.reduce((s, a) => s + a.combatScore.kda, 0) / n;
    const damageRatio = totalDamageTaken > 0 ? totalDamageDealt / totalDamageTaken : 2;

    const avgScore = analyses.reduce((s, a) => s + a.combatScore.score, 0) / n;

    return {
      damageDealt: totalDamageDealt / n,
      damageTaken: totalDamageTaken / n,
      damageRatio,
      engagementRanges: avgEngagementRanges,
      engagementWinRate: analyses.reduce((s, a) => s + a.engagementWinRate, 0) / n,
      combatScore: {
        score: avgScore,
        kda: avgKda,
        damageRatio,
        grade: getGrade(avgScore),
      },
    };
  }
}
