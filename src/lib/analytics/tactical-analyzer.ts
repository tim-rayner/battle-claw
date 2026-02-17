import { FilteredTelemetry } from '../services/telemetry-service';
import {
  HealingDiscipline,
  Location3D,
  ParticipantStats,
  RotationQuality,
  TacticalAnalysis,
  VehicleUsage,
  VulnerablePositioning,
  ZonePositioning,
} from '../../types';

const UNDER_FIRE_MOVE_THRESHOLD_CM = 500; // 5m
const LONG_FOOT_SEGMENT_CM = 30000; // 300m
const FULL_HEALTH_THRESHOLD = 90;

function calculateDistance2D(a: Location3D, b: Location3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function parseElapsedTimeFromEvent(event: { _D: string }): number {
  return new Date(event._D).getTime();
}

export class TacticalAnalyzer {
  analyze(
    telemetry: FilteredTelemetry,
    playerName: string,
    matchDuration: number,
    participantStats?: ParticipantStats | { rideDistance: number; walkDistance: number } | null,
  ): TacticalAnalysis {
    const nameLower = playerName.toLowerCase();
    const positions = telemetry.positions
      .filter((e) => e.character?.name?.toLowerCase() === nameLower)
      .sort((a, b) => a.elapsedTime - b.elapsedTime);

    const gameStates = [...telemetry.gameStates].sort(
      (a, b) => a.gameState.elapsedTime - b.gameState.elapsedTime,
    );

    const zonePositioning = this.analyzeZonePositioning(positions, gameStates);
    const movementStyle = this.determineMovementStyle(positions, zonePositioning);
    const hotDropFrequency = this.estimateHotDropFrequency(positions);

    const result: TacticalAnalysis = {
      zonePositioning,
      movementStyle,
      hotDropFrequency,
      avgSurvivalTime: matchDuration,
    };

    const rideDistance = participantStats?.rideDistance ?? 0;
    const walkDistance = participantStats?.walkDistance ?? 0;
    const vehicleUsage = this.analyzeVehicleUsage(
      telemetry,
      playerName,
      matchDuration,
      rideDistance,
      walkDistance,
      positions,
      gameStates,
    );
    if (vehicleUsage) result.vehicleUsage = vehicleUsage;

    const vulnerablePositioning = this.analyzeVulnerablePositioning(
      positions,
      gameStates,
      matchDuration,
      telemetry.damageTaken.filter((e) => e.victim?.name?.toLowerCase() === nameLower),
    );
    if (vulnerablePositioning) result.vulnerablePositioning = vulnerablePositioning;

    const rotationQuality = this.analyzeRotationQuality(
      positions,
      gameStates,
      matchDuration,
      vulnerablePositioning?.timeInBlueZoneSeconds,
      vulnerablePositioning?.timeInBlueZonePercent,
    );
    if (rotationQuality) result.rotationQuality = rotationQuality;

    const healingDiscipline = this.analyzeHealingDiscipline(
      telemetry,
      nameLower,
    );
    if (healingDiscipline) result.healingDiscipline = healingDiscipline;

    return result;
  }

  private analyzeZonePositioning(
    positions: FilteredTelemetry['positions'],
    gameStates: FilteredTelemetry['gameStates']
  ): ZonePositioning {
    if (positions.length === 0) {
      return {
        insideZonePercent: 0,
        edgePlayPercent: 0,
        centerPlayPercent: 0,
        avgDistanceToCenter: 0,
        lateRotations: 0,
      };
    }

    let insideCount = 0;
    let edgeCount = 0;
    let centerCount = 0;
    let totalDistanceSum = 0;
    let totalSamples = 0;
    let lateRotations = 0;
    let wasOutside = false;

    for (const pos of positions) {
      // Find the closest game state for zone data
      const gameState = this.findClosestGameState(pos.elapsedTime, gameStates);
      if (!gameState) continue;

      const { safetyZonePosition, safetyZoneRadius } = gameState.gameState;
      if (!safetyZonePosition || safetyZoneRadius <= 0) continue;

      const distance = calculateDistance2D(pos.character.location, safetyZonePosition);
      const distanceToEdge = distance - safetyZoneRadius;
      totalDistanceSum += distance;
      totalSamples++;

      if (distance <= safetyZoneRadius) {
        insideCount++;

        // Edge play: within outer 25% of zone
        if (distance > safetyZoneRadius * 0.75) {
          edgeCount++;
        }

        // Center play: within inner 25% of zone
        if (distance < safetyZoneRadius * 0.25) {
          centerCount++;
        }

        // Detect late rotation: was outside, now inside (and zone is significantly smaller)
        if (wasOutside && safetyZoneRadius < 200000) {
          lateRotations++;
        }
        wasOutside = false;
      } else {
        // Check if this constitutes a "dangerous" outside position
        if (distanceToEdge > safetyZoneRadius * 0.1) {
          wasOutside = true;
        }
      }
    }

    const insideZonePercent = totalSamples > 0 ? (insideCount / totalSamples) * 100 : 0;
    const edgePlayPercent = insideCount > 0 ? (edgeCount / insideCount) * 100 : 0;
    const centerPlayPercent = insideCount > 0 ? (centerCount / insideCount) * 100 : 0;
    const avgDistanceToCenter = totalSamples > 0 ? totalDistanceSum / totalSamples : 0;

    return {
      insideZonePercent,
      edgePlayPercent,
      centerPlayPercent,
      avgDistanceToCenter,
      lateRotations,
    };
  }

  private findClosestGameState(
    elapsedTime: number,
    gameStates: FilteredTelemetry['gameStates']
  ) {
    if (gameStates.length === 0) return null;

    let closest = gameStates[0];
    let minDiff = Math.abs(gameStates[0].gameState.elapsedTime - elapsedTime);

    for (const gs of gameStates) {
      const diff = Math.abs(gs.gameState.elapsedTime - elapsedTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = gs;
      }
    }

    return closest;
  }

  private determineMovementStyle(
    positions: FilteredTelemetry['positions'],
    zonePositioning: ZonePositioning
  ): 'aggressive' | 'passive' | 'moderate' {
    if (positions.length < 2) return 'moderate';

    // Calculate total movement distance
    let totalDistance = 0;
    for (let i = 1; i < positions.length; i++) {
      totalDistance += calculateDistance2D(
        positions[i - 1].character.location,
        positions[i].character.location
      );
    }

    const avgMovementPerSample = totalDistance / positions.length;

    // High movement + edge play = aggressive
    if (avgMovementPerSample > 5000 && zonePositioning.edgePlayPercent > 30) {
      return 'aggressive';
    }

    // Low movement + center play = passive
    if (avgMovementPerSample < 2000 && zonePositioning.centerPlayPercent > 20) {
      return 'passive';
    }

    return 'moderate';
  }

  private estimateHotDropFrequency(positions: FilteredTelemetry['positions']): number {
    if (positions.length === 0) return 0;

    // Early game positions (first 60 seconds)
    const earlyPositions = positions.filter((p) => p.elapsedTime <= 60);
    if (earlyPositions.length === 0) return 0;

    // High number of alive players with close proximity = hot drop
    const avgAlivePlayers =
      earlyPositions.reduce((sum, p) => sum + p.numAlivePlayers, 0) / earlyPositions.length;

    // If early game had high alive count in small area, likely hot drop
    // This is a simple heuristic - more than 90% of players alive early on = popular spot
    return avgAlivePlayers > 80 ? 0.7 : avgAlivePlayers > 60 ? 0.4 : 0.2;
  }

  private analyzeVehicleUsage(
    telemetry: FilteredTelemetry,
    playerName: string,
    matchDuration: number,
    rideDistance: number,
    walkDistance: number,
    positions: FilteredTelemetry['positions'],
    gameStates: FilteredTelemetry['gameStates'],
  ): VehicleUsage | null {
    const totalDist = rideDistance + walkDistance;
    const vehicleUsageRatio = totalDist > 0 ? rideDistance / totalDist : 0;

    const usage: VehicleUsage = {
      vehicleUsageRatio,
      rideDistance,
      walkDistance,
    };

    const rides = telemetry.vehicleRides.filter(
      (e) => e.character?.name?.toLowerCase() === playerName.toLowerCase(),
    );
    const leaves = telemetry.vehicleLeaves.filter(
      (e) => e.character?.name?.toLowerCase() === playerName.toLowerCase(),
    );
    if (rides.length > 0 && leaves.length > 0) {
      const sortedRides = [...rides].sort(
        (a, b) => parseElapsedTimeFromEvent(a) - parseElapsedTimeFromEvent(b),
      );
      const sortedLeaves = [...leaves].sort(
        (a, b) => parseElapsedTimeFromEvent(a) - parseElapsedTimeFromEvent(b),
      );
      let timeInVehicleMs = 0;
      let segmentCount = 0;
      for (let i = 0; i < sortedRides.length; i++) {
        const rideTime = parseElapsedTimeFromEvent(sortedRides[i]);
        const leave = sortedLeaves[i];
        if (leave) {
          const leaveTime = parseElapsedTimeFromEvent(leave);
          timeInVehicleMs += Math.max(0, leaveTime - rideTime);
          segmentCount++;
        }
      }
      usage.timeInVehicleSeconds = timeInVehicleMs / 1000;
      usage.timeOnFootSeconds = Math.max(0, matchDuration - usage.timeInVehicleSeconds);
      usage.vehicleSegmentCount = segmentCount;
    } else if (positions.length >= 2) {
      let timeInVehicleMs = 0;
      let timeOnFootMs = 0;
      for (let i = 1; i < positions.length; i++) {
        const dt = (positions[i].elapsedTime - positions[i - 1].elapsedTime) * 1000;
        if (positions[i - 1].vehicle != null && typeof positions[i - 1].vehicle === 'object') {
          timeInVehicleMs += dt;
        } else {
          timeOnFootMs += dt;
        }
      }
      usage.timeInVehicleSeconds = timeInVehicleMs / 1000;
      usage.timeOnFootSeconds = timeOnFootMs / 1000;
    }

    const longFoot = this.countLongFootSegmentsDuringRotations(
      positions,
      gameStates,
      rideDistance,
      walkDistance,
    );
    if (longFoot > 0) usage.longFootSegmentsDuringRotation = longFoot;

    return usage;
  }

  private countLongFootSegmentsDuringRotations(
    positions: FilteredTelemetry['positions'],
    gameStates: FilteredTelemetry['gameStates'],
    rideDistance: number,
    walkDistance: number,
  ): number {
    if (positions.length < 2 || gameStates.length === 0) return 0;
    if (rideDistance > walkDistance) return 0;
    let count = 0;
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];
      const dist = calculateDistance2D(prev.character.location, curr.character.location);
      if (dist < LONG_FOOT_SEGMENT_CM) continue;
      const gs = this.findClosestGameState(curr.elapsedTime, gameStates);
      if (!gs?.gameState.safetyZonePosition || gs.gameState.safetyZoneRadius <= 0) continue;
      const outside =
        calculateDistance2D(curr.character.location, gs.gameState.safetyZonePosition) >
        gs.gameState.safetyZoneRadius;
      const inVehicle = curr.vehicle != null && typeof curr.vehicle === 'object';
      if (outside && !inVehicle) count++;
    }
    return count;
  }

  private analyzeVulnerablePositioning(
    positions: FilteredTelemetry['positions'],
    gameStates: FilteredTelemetry['gameStates'],
    matchDuration: number,
    damageTaken: FilteredTelemetry['damageTaken'],
  ): VulnerablePositioning | null {
    if (positions.length === 0 || gameStates.length === 0) return null;

    let timeInBlueZoneSeconds = 0;
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const gameState = this.findClosestGameState(pos.elapsedTime, gameStates);
      if (!gameState?.gameState.safetyZonePosition || gameState.gameState.safetyZoneRadius <= 0)
        continue;
      const outside =
        calculateDistance2D(pos.character.location, gameState.gameState.safetyZonePosition) >
        gameState.gameState.safetyZoneRadius;
      if (!outside) continue;
      const nextTime = i < positions.length - 1 ? positions[i + 1].elapsedTime : matchDuration;
      const span = nextTime - pos.elapsedTime;
      if (span > 0) timeInBlueZoneSeconds += span;
    }

    const timeInBlueZonePercent =
      matchDuration > 0 ? (timeInBlueZoneSeconds / matchDuration) * 100 : 0;

    const sortedDamage = [...damageTaken].sort(
      (a, b) => parseElapsedTimeFromEvent(a) - parseElapsedTimeFromEvent(b),
    );
    let underFireWithoutMovingCount = 0;
    let underFireWithoutMovingSeconds = 0;
    let prevDamageTime: number | null = null;
    let prevLocation: Location3D | null = null;

    for (const dmg of sortedDamage) {
      const t = parseElapsedTimeFromEvent(dmg);
      const loc = this.getPositionAtTime(positions, t)?.character.location ?? null;
      if (prevDamageTime != null && prevLocation != null && loc != null) {
        const moved = calculateDistance2D(prevLocation, loc);
        if (moved < UNDER_FIRE_MOVE_THRESHOLD_CM) {
          underFireWithoutMovingCount++;
          underFireWithoutMovingSeconds += (t - prevDamageTime) / 1000;
        }
      }
      prevDamageTime = t;
      prevLocation = loc;
    }

    return {
      timeInBlueZoneSeconds,
      timeInBlueZonePercent,
      underFireWithoutMovingCount,
      underFireWithoutMovingSeconds:
        underFireWithoutMovingSeconds > 0 ? underFireWithoutMovingSeconds : undefined,
    };
  }

  private getPositionAtTime(
    positions: FilteredTelemetry['positions'],
    timeMs: number,
  ): (typeof positions)[0] | null {
    const timeSec = timeMs / 1000;
    if (positions.length === 0) return null;
    let best = positions[0];
    let minDiff = Math.abs(positions[0].elapsedTime - timeSec);
    for (const p of positions) {
      const diff = Math.abs(p.elapsedTime - timeSec);
      if (diff < minDiff) {
        minDiff = diff;
        best = p;
      }
    }
    return best;
  }

  private analyzeRotationQuality(
    positions: FilteredTelemetry['positions'],
    gameStates: FilteredTelemetry['gameStates'],
    matchDuration: number,
    timeInBlueZoneSeconds?: number,
    timeInBlueZonePercent?: number,
  ): RotationQuality | null {
    if (positions.length === 0) return null;

    const timeInGasSeconds = timeInBlueZoneSeconds ?? 0;
    const timeInGasPercent = timeInBlueZonePercent ?? (matchDuration > 0 ? (timeInGasSeconds / matchDuration) * 100 : 0);

    let footDistanceDuringRotations = 0;
    let vehicleDistanceDuringRotations = 0;

    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];
      const gsPrev = this.findClosestGameState(prev.elapsedTime, gameStates);
      const gsCurr = this.findClosestGameState(curr.elapsedTime, gameStates);
      const outsidePrev =
        gsPrev?.gameState.safetyZonePosition && gsPrev.gameState.safetyZoneRadius > 0
          ? calculateDistance2D(prev.character.location, gsPrev.gameState.safetyZonePosition) >
            gsPrev.gameState.safetyZoneRadius
          : false;
      const outsideCurr =
        gsCurr?.gameState.safetyZonePosition && gsCurr.gameState.safetyZoneRadius > 0
          ? calculateDistance2D(curr.character.location, gsCurr.gameState.safetyZonePosition) >
            gsCurr.gameState.safetyZoneRadius
          : false;
      if (!outsidePrev && !outsideCurr) continue;
      const dist = calculateDistance2D(prev.character.location, curr.character.location);
      const inVehicle = prev.vehicle != null && typeof prev.vehicle === 'object';
      if (inVehicle) vehicleDistanceDuringRotations += dist;
      else footDistanceDuringRotations += dist;
    }

    return {
      timeInGasSeconds,
      timeInGasPercent,
      footDistanceDuringRotations: footDistanceDuringRotations > 0 ? footDistanceDuringRotations : undefined,
      vehicleDistanceDuringRotations: vehicleDistanceDuringRotations > 0 ? vehicleDistanceDuringRotations : undefined,
    };
  }

  private analyzeHealingDiscipline(
    telemetry: FilteredTelemetry,
    nameLower: string,
  ): HealingDiscipline | null {
    const heals = telemetry.heals
      .filter((e) => e.character?.name?.toLowerCase() === nameLower)
      .sort((a, b) => parseElapsedTimeFromEvent(a) - parseElapsedTimeFromEvent(b));
    const damageTaken = telemetry.damageTaken
      .filter((e) => e.victim?.name?.toLowerCase() === nameLower)
      .sort((a, b) => parseElapsedTimeFromEvent(a) - parseElapsedTimeFromEvent(b));
    const killsAsVictim = telemetry.kills
      .filter((e) => e.victim?.name?.toLowerCase() === nameLower)
      .sort((a, b) => parseElapsedTimeFromEvent(a) - parseElapsedTimeFromEvent(b));

    type TimelineEvent = { t: number; type: 'heal'; amount: number } | { t: number; type: 'damage'; amount: number } | { t: number; type: 'death' };
    const events: TimelineEvent[] = [];
    for (const h of heals) {
      events.push({ t: parseElapsedTimeFromEvent(h), type: 'heal', amount: h.healamount ?? 0 });
    }
    for (const d of damageTaken) {
      events.push({ t: parseElapsedTimeFromEvent(d), type: 'damage', amount: d.damage ?? 0 });
    }
    for (const k of killsAsVictim) {
      events.push({ t: parseElapsedTimeFromEvent(k), type: 'death' });
    }
    events.sort((a, b) => a.t - b.t);

    let health = 100;
    let engagementsAtFullHealthCount = 0;
    let engagementsAtLowHealthCount = 0;
    const healToNextDamageTimes: number[] = [];
    let lastHealTime: number | null = null;

    for (const ev of events) {
      if (ev.type === 'heal') {
        health = Math.min(100, health + ev.amount);
        lastHealTime = ev.t;
      } else if (ev.type === 'damage' || ev.type === 'death') {
        if (lastHealTime != null && ev.type === 'damage') {
          healToNextDamageTimes.push((ev.t - lastHealTime) / 1000);
        }
        if (health >= FULL_HEALTH_THRESHOLD) engagementsAtFullHealthCount++;
        else engagementsAtLowHealthCount++;
        if (ev.type === 'damage') health = Math.max(0, health - ev.amount);
      }
    }

    const totalEngagements = engagementsAtFullHealthCount + engagementsAtLowHealthCount;
    if (totalEngagements === 0 && heals.length === 0) return null;

    const avgTimeBetweenHealAndNextDamageSeconds =
      healToNextDamageTimes.length > 0
        ? healToNextDamageTimes.reduce((a, b) => a + b, 0) / healToNextDamageTimes.length
        : undefined;

    return {
      engagementsAtFullHealthCount,
      engagementsAtLowHealthCount,
      totalEngagements: totalEngagements > 0 ? totalEngagements : undefined,
      avgTimeBetweenHealAndNextDamageSeconds,
    };
  }

  aggregateAcrossMatches(analyses: TacticalAnalysis[]): TacticalAnalysis {
    if (analyses.length === 0) {
      return {
        zonePositioning: {
          insideZonePercent: 0,
          edgePlayPercent: 0,
          centerPlayPercent: 0,
          avgDistanceToCenter: 0,
          lateRotations: 0,
        },
        movementStyle: 'moderate',
        hotDropFrequency: 0,
        avgSurvivalTime: 0,
      };
    }

    const avgZone: ZonePositioning = {
      insideZonePercent: analyses.reduce((s, a) => s + a.zonePositioning.insideZonePercent, 0) / analyses.length,
      edgePlayPercent: analyses.reduce((s, a) => s + a.zonePositioning.edgePlayPercent, 0) / analyses.length,
      centerPlayPercent: analyses.reduce((s, a) => s + a.zonePositioning.centerPlayPercent, 0) / analyses.length,
      avgDistanceToCenter: analyses.reduce((s, a) => s + a.zonePositioning.avgDistanceToCenter, 0) / analyses.length,
      lateRotations: analyses.reduce((s, a) => s + a.zonePositioning.lateRotations, 0),
    };

    const styleCount = { aggressive: 0, passive: 0, moderate: 0 };
    for (const a of analyses) styleCount[a.movementStyle]++;
    const movementStyle = Object.entries(styleCount).sort((a, b) => b[1] - a[1])[0][0] as TacticalAnalysis['movementStyle'];

    const result: TacticalAnalysis = {
      zonePositioning: avgZone,
      movementStyle,
      hotDropFrequency: analyses.reduce((s, a) => s + a.hotDropFrequency, 0) / analyses.length,
      avgSurvivalTime: analyses.reduce((s, a) => s + a.avgSurvivalTime, 0) / analyses.length,
    };

    const withVehicle = analyses.filter((a) => a.vehicleUsage != null);
    if (withVehicle.length > 0) {
      result.vehicleUsage = {
        vehicleUsageRatio: withVehicle.reduce((s, a) => s + (a.vehicleUsage!.vehicleUsageRatio ?? 0), 0) / withVehicle.length,
        rideDistance: withVehicle.reduce((s, a) => s + (a.vehicleUsage!.rideDistance ?? 0), 0) / withVehicle.length,
        walkDistance: withVehicle.reduce((s, a) => s + (a.vehicleUsage!.walkDistance ?? 0), 0) / withVehicle.length,
        timeInVehicleSeconds: withVehicle.some((a) => a.vehicleUsage!.timeInVehicleSeconds != null)
          ? withVehicle.reduce((s, a) => s + (a.vehicleUsage!.timeInVehicleSeconds ?? 0), 0) / withVehicle.length
          : undefined,
        timeOnFootSeconds: withVehicle.some((a) => a.vehicleUsage!.timeOnFootSeconds != null)
          ? withVehicle.reduce((s, a) => s + (a.vehicleUsage!.timeOnFootSeconds ?? 0), 0) / withVehicle.length
          : undefined,
        vehicleSegmentCount: withVehicle.some((a) => a.vehicleUsage!.vehicleSegmentCount != null)
          ? Math.round(withVehicle.reduce((s, a) => s + (a.vehicleUsage!.vehicleSegmentCount ?? 0), 0) / withVehicle.length)
          : undefined,
        longFootSegmentsDuringRotation: withVehicle.some((a) => a.vehicleUsage!.longFootSegmentsDuringRotation != null)
          ? withVehicle.reduce((s, a) => s + (a.vehicleUsage!.longFootSegmentsDuringRotation ?? 0), 0)
          : undefined,
      };
    }

    const withVuln = analyses.filter((a) => a.vulnerablePositioning != null);
    if (withVuln.length > 0) {
      result.vulnerablePositioning = {
        timeInBlueZoneSeconds: withVuln.reduce((s, a) => s + (a.vulnerablePositioning!.timeInBlueZoneSeconds ?? 0), 0) / withVuln.length,
        timeInBlueZonePercent: withVuln.reduce((s, a) => s + (a.vulnerablePositioning!.timeInBlueZonePercent ?? 0), 0) / withVuln.length,
        underFireWithoutMovingCount: withVuln.reduce((s, a) => s + (a.vulnerablePositioning!.underFireWithoutMovingCount ?? 0), 0),
        underFireWithoutMovingSeconds: withVuln.some((a) => a.vulnerablePositioning!.underFireWithoutMovingSeconds != null)
          ? withVuln.reduce((s, a) => s + (a.vulnerablePositioning!.underFireWithoutMovingSeconds ?? 0), 0) / withVuln.length
          : undefined,
      };
    }

    const withHeal = analyses.filter((a) => a.healingDiscipline != null);
    if (withHeal.length > 0) {
      result.healingDiscipline = {
        engagementsAtFullHealthCount: withHeal.reduce((s, a) => s + (a.healingDiscipline!.engagementsAtFullHealthCount ?? 0), 0),
        engagementsAtLowHealthCount: withHeal.reduce((s, a) => s + (a.healingDiscipline!.engagementsAtLowHealthCount ?? 0), 0),
        totalEngagements: withHeal.reduce((s, a) => s + (a.healingDiscipline!.totalEngagements ?? 0), 0) || undefined,
        avgTimeBetweenHealAndNextDamageSeconds: withHeal.some((a) => a.healingDiscipline!.avgTimeBetweenHealAndNextDamageSeconds != null)
          ? withHeal.reduce((s, a) => s + (a.healingDiscipline!.avgTimeBetweenHealAndNextDamageSeconds ?? 0), 0) / withHeal.length
          : undefined,
      };
    }

    const withRot = analyses.filter((a) => a.rotationQuality != null);
    if (withRot.length > 0) {
      result.rotationQuality = {
        timeInGasSeconds: withRot.reduce((s, a) => s + (a.rotationQuality!.timeInGasSeconds ?? 0), 0) / withRot.length,
        timeInGasPercent: withRot.reduce((s, a) => s + (a.rotationQuality!.timeInGasPercent ?? 0), 0) / withRot.length,
        footDistanceDuringRotations: withRot.some((a) => a.rotationQuality!.footDistanceDuringRotations != null)
          ? withRot.reduce((s, a) => s + (a.rotationQuality!.footDistanceDuringRotations ?? 0), 0) / withRot.length
          : undefined,
        vehicleDistanceDuringRotations: withRot.some((a) => a.rotationQuality!.vehicleDistanceDuringRotations != null)
          ? withRot.reduce((s, a) => s + (a.rotationQuality!.vehicleDistanceDuringRotations ?? 0), 0) / withRot.length
          : undefined,
      };
    }

    return result;
  }
}
