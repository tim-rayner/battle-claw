import { FilteredTelemetry } from '../services/telemetry-service';
import { TacticalAnalysis, ZonePositioning, Location3D } from '../../types';

function calculateDistance2D(a: Location3D, b: Location3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export class TacticalAnalyzer {
  analyze(telemetry: FilteredTelemetry, playerName: string, matchDuration: number): TacticalAnalysis {
    const nameLower = playerName.toLowerCase();
    const positions = telemetry.positions
      .filter(e => e.character?.name?.toLowerCase() === nameLower)
      .sort((a, b) => a.elapsedTime - b.elapsedTime);

    const gameStates = [...telemetry.gameStates].sort(
      (a, b) => a.gameState.elapsedTime - b.gameState.elapsedTime
    );

    const zonePositioning = this.analyzeZonePositioning(positions, gameStates);
    const movementStyle = this.determineMovementStyle(positions, zonePositioning);
    const hotDropFrequency = this.estimateHotDropFrequency(positions);

    return {
      zonePositioning,
      movementStyle,
      hotDropFrequency,
      avgSurvivalTime: matchDuration,
    };
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
    const earlyPositions = positions.filter(p => p.elapsedTime <= 60);
    if (earlyPositions.length === 0) return 0;

    // High number of alive players with close proximity = hot drop
    const avgAlivePlayers = earlyPositions.reduce((sum, p) => sum + p.numAlivePlayers, 0)
      / earlyPositions.length;

    // If early game had high alive count in small area, likely hot drop
    // This is a simple heuristic - more than 90% of players alive early on = popular spot
    return avgAlivePlayers > 80 ? 0.7 : avgAlivePlayers > 60 ? 0.4 : 0.2;
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

    // Majority style
    const styleCount = { aggressive: 0, passive: 0, moderate: 0 };
    for (const a of analyses) styleCount[a.movementStyle]++;
    const movementStyle = Object.entries(styleCount).sort((a, b) => b[1] - a[1])[0][0] as TacticalAnalysis['movementStyle'];

    return {
      zonePositioning: avgZone,
      movementStyle,
      hotDropFrequency: analyses.reduce((s, a) => s + a.hotDropFrequency, 0) / analyses.length,
      avgSurvivalTime: analyses.reduce((s, a) => s + a.avgSurvivalTime, 0) / analyses.length,
    };
  }
}
