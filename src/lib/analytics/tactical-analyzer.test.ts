import type { FilteredTelemetry } from "../services/telemetry-service";
import type {
  LogGameStatePeriodic,
  LogHeal,
  LogPlayerPosition,
  LogPlayerTakeDamage,
} from "../../types";
import { TacticalAnalyzer } from "./tactical-analyzer";

function emptyTelemetry(): FilteredTelemetry {
  return {
    attacks: [],
    fireCountEvents: [],
    kills: [],
    damageTaken: [],
    damageDealtEvents: [],
    positions: [],
    itemPickups: [],
    itemEquips: [],
    heals: [],
    itemUses: [],
    gameStates: [],
    vehicleRides: [],
    vehicleLeaves: [],
  };
}

function makePosition(
  name: string,
  elapsedTime: number,
  x: number,
  y: number,
  inVehicle = false,
): LogPlayerPosition {
  return {
    _T: "LogPlayerPosition",
    _D: new Date(elapsedTime * 1000).toISOString(),
    character: {
      name,
      teamId: 1,
      health: 100,
      location: { x, y, z: 0 },
      ranking: 0,
      accountId: "test",
    },
    vehicle: inVehicle ? { vehicleId: "v1" } : null,
    elapsedTime,
    numAlivePlayers: 50,
    isGame: 1,
  };
}

function makeGameState(elapsedTime: number, zoneX: number, zoneY: number, radius: number): LogGameStatePeriodic {
  return {
    _T: "LogGameStatePeriodic",
    _D: new Date(elapsedTime * 1000).toISOString(),
    gameState: {
      elapsedTime,
      numAliveTeams: 10,
      numJoinPlayers: 100,
      numStartPlayers: 100,
      numAlivePlayers: 50,
      safetyZonePosition: { x: zoneX, y: zoneY, z: 0 },
      safetyZoneRadius: radius,
      poisonGasWarningPosition: { x: zoneX, y: zoneY, z: 0 },
      poisonGasWarningRadius: radius * 1.5,
      redZonePosition: { x: 0, y: 0, z: 0 },
      redZoneRadius: 0,
    },
  };
}

describe("TacticalAnalyzer", () => {
  const analyzer = new TacticalAnalyzer();

  describe("vehicle usage", () => {
    it("computes vehicleUsageRatio from participant stats", () => {
      const telemetry = emptyTelemetry();
      const tactics = analyzer.analyze(
        telemetry,
        "Player1",
        600,
        { rideDistance: 30000, walkDistance: 70000 } as any,
      );
      expect(tactics.vehicleUsage).toBeDefined();
      expect(tactics.vehicleUsage!.vehicleUsageRatio).toBe(0.3); // 30k / (30k+70k)
      expect(tactics.vehicleUsage!.rideDistance).toBe(30000);
      expect(tactics.vehicleUsage!.walkDistance).toBe(70000);
    });

    it("handles zero total distance", () => {
      const telemetry = emptyTelemetry();
      const tactics = analyzer.analyze(
        telemetry,
        "Player1",
        600,
        { rideDistance: 0, walkDistance: 0 } as any,
      );
      expect(tactics.vehicleUsage).toBeDefined();
      expect(tactics.vehicleUsage!.vehicleUsageRatio).toBe(0);
    });
  });

  describe("vulnerable positioning", () => {
    it("computes timeInBlueZoneSeconds and underFireWithoutMovingCount", () => {
      const telemetry = emptyTelemetry();
      const zoneCenter = { x: 0, y: 0, z: 0 };
      const radius = 100000; // 1000m - position at 150000 is outside
      telemetry.positions = [
        makePosition("Player1", 0, 150000, 0),   // outside
        makePosition("Player1", 30, 150000, 0), // outside
      ];
      telemetry.gameStates = [
        makeGameState(0, 0, 0, radius),
        makeGameState(30, 0, 0, radius),
      ];
      const tactics = analyzer.analyze(telemetry, "Player1", 600);
      expect(tactics.vulnerablePositioning).toBeDefined();
      expect(tactics.vulnerablePositioning!.timeInBlueZoneSeconds).toBeGreaterThan(0);
      expect(tactics.vulnerablePositioning!.timeInBlueZonePercent).toBeGreaterThanOrEqual(0);
      expect(tactics.vulnerablePositioning!.underFireWithoutMovingCount).toBe(0);
    });
  });

  describe("healing discipline", () => {
    it("counts engagements at full vs low health from heal and damage timeline", () => {
      const telemetry = emptyTelemetry();
      const baseTime = new Date("2024-01-01T12:00:00Z").getTime();
      telemetry.heals = [
        {
          _T: "LogHeal",
          _D: new Date(baseTime).toISOString(),
          character: { name: "Player1", teamId: 1, health: 80, location: { x: 0, y: 0, z: 0 }, ranking: 0, accountId: "a" },
          item: { itemId: "FirstAid", stackCount: 1, category: "Consumable", subCategory: "Heal", attachedItems: [] },
          healamount: 50,
        } as LogHeal,
      ];
      telemetry.damageTaken = [
        {
          _T: "LogPlayerTakeDamage",
          _D: new Date(baseTime + 5000).toISOString(),
          attackId: 1,
          attacker: null,
          victim: { name: "Player1", teamId: 1, health: 100, location: { x: 0, y: 0, z: 0 }, ranking: 0, accountId: "a" },
          damageTypeCategory: "Damage_Weapon",
          damageReason: "TorsoShot",
          damage: 30,
          damageCauserName: "WeapAKM",
          additionalInfo: [],
          isThroughPenetrableWall: false,
        } as LogPlayerTakeDamage,
      ];
      const tactics = analyzer.analyze(telemetry, "Player1", 600);
      expect(tactics.healingDiscipline).toBeDefined();
      expect(tactics.healingDiscipline!.engagementsAtFullHealthCount).toBeGreaterThanOrEqual(0);
      expect(tactics.healingDiscipline!.engagementsAtLowHealthCount).toBeGreaterThanOrEqual(0);
      expect(
        tactics.healingDiscipline!.engagementsAtFullHealthCount + tactics.healingDiscipline!.engagementsAtLowHealthCount,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  describe("rotation quality", () => {
    it("exposes timeInGasSeconds and timeInGasPercent", () => {
      const telemetry = emptyTelemetry();
      const radius = 100000;
      telemetry.positions = [
        makePosition("Player1", 0, 150000, 0),
        makePosition("Player1", 60, 150000, 0),
      ];
      telemetry.gameStates = [
        makeGameState(0, 0, 0, radius),
        makeGameState(60, 0, 0, radius),
      ];
      const tactics = analyzer.analyze(telemetry, "Player1", 600);
      expect(tactics.rotationQuality).toBeDefined();
      expect(tactics.rotationQuality!.timeInGasSeconds).toBeGreaterThanOrEqual(0);
      expect(tactics.rotationQuality!.timeInGasPercent).toBeGreaterThanOrEqual(0);
    });
  });

  describe("aggregateAcrossMatches", () => {
    it("merges vehicleUsage, vulnerablePositioning, healingDiscipline, rotationQuality", () => {
      const telemetry = emptyTelemetry();
      const radius = 100000;
      telemetry.positions = [
        makePosition("Player1", 0, 150000, 0),
        makePosition("Player1", 30, 150000, 0),
      ];
      telemetry.gameStates = [makeGameState(0, 0, 0, radius), makeGameState(30, 0, 0, radius)];
      const a1 = analyzer.analyze(telemetry, "Player1", 600, { rideDistance: 10000, walkDistance: 90000 } as any);
      const a2 = analyzer.analyze(telemetry, "Player1", 600, { rideDistance: 20000, walkDistance: 80000 } as any);
      const aggregated = analyzer.aggregateAcrossMatches([a1, a2]);
      expect(aggregated.vehicleUsage).toBeDefined();
      expect(aggregated.vehicleUsage!.vehicleUsageRatio).toBeCloseTo((0.1 + 0.2) / 2);
      expect(aggregated.vulnerablePositioning).toBeDefined();
      expect(aggregated.rotationQuality).toBeDefined();
    });
  });
});
