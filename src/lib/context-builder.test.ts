import { ContextBuilder } from "./context-builder";
import type { SquadAnalysis } from "../types";

function minimalSquadAnalysis(withTacticalExtras: boolean): SquadAnalysis {
  const tactics: SquadAnalysis["players"][0]["tactics"] = {
    zonePositioning: {
      insideZonePercent: 70,
      edgePlayPercent: 20,
      centerPlayPercent: 30,
      avgDistanceToCenter: 50000,
      lateRotations: 1,
    },
    movementStyle: "moderate",
    hotDropFrequency: 0.3,
    avgSurvivalTime: 900,
  };
  if (withTacticalExtras) {
    tactics.vehicleUsage = {
      vehicleUsageRatio: 0.4,
      rideDistance: 40000,
      walkDistance: 60000,
    };
    tactics.vulnerablePositioning = {
      timeInBlueZoneSeconds: 45,
      timeInBlueZonePercent: 5,
      underFireWithoutMovingCount: 2,
    };
    tactics.healingDiscipline = {
      engagementsAtFullHealthCount: 3,
      engagementsAtLowHealthCount: 1,
      totalEngagements: 4,
    };
    tactics.rotationQuality = {
      timeInGasSeconds: 45,
      timeInGasPercent: 5,
    };
  }
  return {
    players: [
      {
        name: "TestPlayer",
        matchesAnalyzed: 1,
        avgStats: {
          name: "TestPlayer",
          kills: 2,
          deaths: 1,
          assists: 0,
          damageDealt: 200,
          damageTaken: 150,
          survivalTime: 900,
          winPlace: 5,
          headshotKills: 1,
          DBNOs: 0,
          revives: 0,
          boosts: 2,
          heals: 3,
          walkDistance: 60000,
          rideDistance: 40000,
        },
        aim: {
          overallAccuracy: 0.2,
          weaponBreakdown: {},
          headshotRate: 0.5,
          bestWeapon: "AKM",
          bestWeaponAccuracy: 0.22,
        },
        weapons: { mostEffective: "AKM", effectiveness: {}, rankings: [] },
        tactics,
        combat: {
          damageDealt: 200,
          damageTaken: 150,
          damageRatio: 1.33,
          engagementRanges: { close: 0.5, medium: 0.3, long: 0.2, extreme: 0 },
          engagementWinRate: 0.67,
          combatScore: { score: 2.5, grade: "B", kda: 2, damageRatio: 1.33 },
        },
      },
    ],
    matchesAnalyzed: 1,
    dateRange: { start: "2024-01-01T00:00:00Z", end: "2024-01-01T00:15:00Z" },
    insights: [],
    squadStats: {
      avgPlacement: 5,
      totalKills: 2,
      avgDamage: 200,
      avgSurvivalTime: 900,
    },
  };
}

describe("ContextBuilder", () => {
  const builder = new ContextBuilder();

  it("includes Suggested prompts for AI section", () => {
    const analysis = minimalSquadAnalysis(false);
    const markdown = builder.buildMarkdown(analysis);
    expect(markdown).toContain("Suggested prompts for AI");
    expect(markdown).toContain("Did this player rotate on foot when a vehicle would have been safer or faster?");
    expect(markdown).toContain("Did they med to full before re-engaging after taking damage?");
    expect(markdown).toContain("How much time did they spend in vulnerable positions");
    expect(markdown).toContain("What are the top tactical improvements beyond aim?");
  });

  it("includes Vehicle usage when present", () => {
    const analysis = minimalSquadAnalysis(true);
    const markdown = builder.buildMarkdown(analysis);
    expect(markdown).toContain("**Vehicle usage:**");
    expect(markdown).toContain("Vehicle usage ratio");
  });

  it("includes Vulnerable positioning when present", () => {
    const analysis = minimalSquadAnalysis(true);
    const markdown = builder.buildMarkdown(analysis);
    expect(markdown).toContain("**Vulnerable positioning:**");
    expect(markdown).toContain("Time in blue zone");
    expect(markdown).toContain("Under fire without moving");
  });

  it("includes Healing discipline when present", () => {
    const analysis = minimalSquadAnalysis(true);
    const markdown = builder.buildMarkdown(analysis);
    expect(markdown).toContain("**Healing discipline:**");
    expect(markdown).toContain("Engagements at full health");
    expect(markdown).toContain("Engagements at low health");
  });

  it("includes Rotation quality when present", () => {
    const analysis = minimalSquadAnalysis(true);
    const markdown = builder.buildMarkdown(analysis);
    expect(markdown).toContain("**Rotation quality:**");
    expect(markdown).toContain("Time in gas");
  });
});
