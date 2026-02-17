import { resolveItemName } from "../constants/items";
import { Insight, PlayerAnalysis, SquadAnalysis } from "../types";
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatNumber,
  formatPercent,
} from "../utils/formatters";

export class ContextBuilder {
  buildMarkdown(analysis: SquadAnalysis): string {
    const lines: string[] = [];

    lines.push("# PUBG Match Analysis Context");
    if (analysis.mapName) {
      lines.push(`**Map:** ${analysis.mapName}`);
    }
    lines.push(
      `**Players:** ${analysis.players.map((p) => p.name).join(", ")}`,
    );
    lines.push(
      `**Matches Analyzed:** ${analysis.matchesAnalyzed} (${formatDate(analysis.dateRange.start)} - ${formatDate(analysis.dateRange.end)})`,
    );
    if (analysis.reportMode) {
      lines.push(
        `**Report mode:** ${analysis.reportMode === "today" ? "Today's matches" : "Single match"}`,
      );
    }
    lines.push("**Platform:** Steam");
    lines.push("");

    // Squad summary
    lines.push("## Match Performance Summary");
    lines.push(
      `- Average Placement: #${formatNumber(analysis.squadStats.avgPlacement)}`,
    );
    lines.push(
      `- Squad Kills: ${analysis.squadStats.totalKills} total (${formatNumber(analysis.squadStats.totalKills / analysis.matchesAnalyzed)} per match)`,
    );
    lines.push(
      `- Squad Damage: ${Math.round(analysis.squadStats.avgDamage)} per match`,
    );
    lines.push(
      `- Average Survival: ${formatDuration(analysis.squadStats.avgSurvivalTime)}`,
    );
    lines.push("");

    // Individual performance
    lines.push("## Individual Performance");
    lines.push("");

    for (const player of analysis.players) {
      lines.push(`### ${player.name}`);
      lines.push("**Combat Stats:**");
      lines.push(
        `- K/D/A: ${formatNumber(player.avgStats.kills)} / ${formatNumber(player.avgStats.deaths)} / ${formatNumber(player.avgStats.assists)} (KDA: ${formatNumber(player.combat.combatScore.kda)})`,
      );
      lines.push(
        `- Accuracy: ${formatPercent(player.aim.overallAccuracy)} overall`,
      );
      lines.push(
        `- Best Weapon: ${player.aim.bestWeapon} (${formatPercent(player.aim.bestWeaponAccuracy)} accuracy)`,
      );
      lines.push(`- Combat Grade: ${player.combat.combatScore.grade}`);
      lines.push("");

      lines.push("**Tactical Profile:**");
      lines.push(
        `- Zone positioning: ${formatNumber(player.tactics.zonePositioning.insideZonePercent)}% inside safe zone`,
      );
      lines.push(
        `- Style: ${this.capitalizeStyle(player.tactics.movementStyle)}`,
      );
      lines.push(
        `- Late rotations: ${player.tactics.zonePositioning.lateRotations}`,
      );
      lines.push("");

      if (player.tactics.vehicleUsage) {
        const v = player.tactics.vehicleUsage;
        lines.push("**Vehicle usage:**");
        lines.push(`- Vehicle usage ratio: ${formatPercent(v.vehicleUsageRatio)}`);
        lines.push(`- Ride distance: ${formatDistance(v.rideDistance)} | Walk distance: ${formatDistance(v.walkDistance)}`);
        if (v.timeInVehicleSeconds != null && v.timeOnFootSeconds != null) {
          lines.push(`- Time in vehicle: ${formatDuration(Math.round(v.timeInVehicleSeconds))} | Time on foot: ${formatDuration(Math.round(v.timeOnFootSeconds))}`);
        }
        if (v.longFootSegmentsDuringRotation != null && v.longFootSegmentsDuringRotation > 0) {
          lines.push(`- Long foot segments during rotations: ${v.longFootSegmentsDuringRotation} (consider using a vehicle)`);
        }
        lines.push("");
      }

      if (player.tactics.vulnerablePositioning) {
        const v = player.tactics.vulnerablePositioning;
        lines.push("**Vulnerable positioning:**");
        lines.push(`- Time in blue zone: ${formatNumber(v.timeInBlueZoneSeconds)} s (${formatNumber(v.timeInBlueZonePercent)}% of match)`);
        lines.push(`- Under fire without moving: ${v.underFireWithoutMovingCount} incident(s)`);
        if (v.underFireWithoutMovingSeconds != null && v.underFireWithoutMovingSeconds > 0) {
          lines.push(`- Time under fire without moving: ${formatNumber(v.underFireWithoutMovingSeconds)} s`);
        }
        lines.push("");
      }

      if (player.tactics.healingDiscipline) {
        const h = player.tactics.healingDiscipline;
        lines.push("**Healing discipline:**");
        lines.push(`- Engagements at full health: ${h.engagementsAtFullHealthCount}`);
        lines.push(`- Engagements at low health: ${h.engagementsAtLowHealthCount}`);
        if (h.totalEngagements != null) {
          lines.push(`- Total engagements: ${h.totalEngagements}`);
        }
        if (h.avgTimeBetweenHealAndNextDamageSeconds != null) {
          lines.push(`- Avg time between last heal and next damage: ${formatNumber(h.avgTimeBetweenHealAndNextDamageSeconds)} s`);
        }
        lines.push("");
      }

      if (player.tactics.rotationQuality) {
        const r = player.tactics.rotationQuality;
        lines.push("**Rotation quality:**");
        lines.push(`- Time in gas: ${formatNumber(r.timeInGasSeconds)} s (${formatNumber(r.timeInGasPercent)}% of match)`);
        if (r.footDistanceDuringRotations != null || r.vehicleDistanceDuringRotations != null) {
          lines.push(`- Foot distance during rotations: ${formatDistance(r.footDistanceDuringRotations ?? 0)} | Vehicle distance: ${formatDistance(r.vehicleDistanceDuringRotations ?? 0)}`);
        }
        lines.push("");
      }

      if (player.killFeed && player.killFeed.length > 0) {
        const matchStart = analysis.dateRange.start
          ? new Date(analysis.dateRange.start).getTime()
          : 0;
        lines.push("**Kill Feed:**");
        lines.push("| Time | Victim | Weapon | Distance | Headshot |");
        lines.push("|------|--------|--------|----------|----------|");
        for (const kill of player.killFeed) {
          const killTime = new Date(kill.timestamp).getTime();
          const elapsed =
            matchStart > 0
              ? Math.max(0, Math.floor((killTime - matchStart) / 1000))
              : 0;
          const timeStr = elapsed > 0 ? formatDuration(elapsed) : "--:--";
          const hs = kill.headshot ? "Yes" : "";
          lines.push(
            `| ${timeStr} | ${kill.victim} | ${kill.weapon} | ${formatDistance(kill.distance * 100)} | ${hs} |`,
          );
        }
        lines.push("");
      }

      if (player.consumablesUsed && player.consumablesUsed.length > 0) {
        lines.push("**Consumables Used:**");
        lines.push("| Item | Uses | Heal |");
        lines.push("|------|------|------|");
        for (const c of player.consumablesUsed) {
          const heal =
            c.healamount != null ? Math.round(c.healamount).toString() : "—";
          lines.push(`| ${resolveItemName(c.itemId)} | ${c.count} | ${heal} |`);
        }
        lines.push("");
      }

      if (player.damageReceived && player.damageReceived.length > 0) {
        lines.push("**Damage Received:**");
        lines.push("| Attacker | Damage | Hits |");
        lines.push("|----------|--------|------|");
        for (const e of player.damageReceived) {
          lines.push(`| ${e.attacker} | ${Math.round(e.damage)} | ${e.hits} |`);
        }
        lines.push("");
      }

      if (
        player.bodyPartBreakdown &&
        Object.keys(player.bodyPartBreakdown).length > 0
      ) {
        lines.push("**Damage received by body part:**");
        lines.push("| Body part | Damage received | Hits |");
        lines.push("|------------|-----------------|------|");
        const partEntries = Object.entries(player.bodyPartBreakdown).sort(
          (a, b) => b[1].damage - a[1].damage,
        );
        for (const [reason, v] of partEntries) {
          lines.push(`| ${reason} | ${Math.round(v.damage)} | ${v.hits} |`);
        }
        lines.push("");
      }

      const strengths = this.identifyStrengths(player);
      const improvements = this.identifyImprovements(player);

      if (strengths.length > 0) {
        lines.push("**Strengths:**");
        for (const s of strengths) lines.push(`- ${s}`);
        lines.push("");
      }

      if (improvements.length > 0) {
        lines.push("**Areas for Improvement:**");
        for (const s of improvements) lines.push(`- ${s}`);
        lines.push("");
      }
    }

    // Squad weapon analysis
    if (analysis.players.length > 1) {
      lines.push("## Squad Analysis");
      lines.push("");
      lines.push("### Weapon Performance");
      lines.push("| Weapon | Squad Kills | Effectiveness |");
      lines.push("|--------|-------------|---------------|");

      const allWeapons = new Map<string, { kills: number; score: number }>();
      for (const player of analysis.players) {
        for (const [weapon, stats] of Object.entries(
          player.weapons.effectiveness,
        )) {
          const existing = allWeapons.get(weapon) ?? { kills: 0, score: 0 };
          allWeapons.set(weapon, {
            kills: existing.kills + stats.kills,
            score: Math.max(existing.score, stats.effectivenessScore),
          });
        }
      }

      const sortedWeapons = [...allWeapons.entries()].sort(
        (a, b) => b[1].kills - a[1].kills,
      );
      for (const [weapon, stats] of sortedWeapons.slice(0, 6)) {
        const stars = this.getStarRating(stats.score);
        lines.push(`| ${weapon} | ${stats.kills} | ${stars} |`);
      }
      lines.push("");
    }

    // Insights
    if (analysis.insights.length > 0) {
      lines.push("## Key Insights & Recommendations");
      lines.push("");

      const byCategory = new Map<string, Insight[]>();
      for (const insight of analysis.insights) {
        const cat = insight.category;
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(insight);
      }

      for (const [category, insights] of byCategory) {
        lines.push(`### ${this.capitalizeCategory(category)}`);
        for (const insight of insights) {
          const severity =
            insight.severity === "high"
              ? "**[HIGH]**"
              : insight.severity === "medium"
                ? "[MEDIUM]"
                : "[LOW]";
          lines.push(`- ${severity} **${insight.player}:** ${insight.message}`);
          lines.push(`  - Recommendation: ${insight.recommendation}`);
        }
        lines.push("");
      }
    }

    lines.push("---");
    lines.push("");
    lines.push("## Suggested prompts for AI");
    lines.push("");
    lines.push("You can use this context to answer questions such as:");
    lines.push("");
    lines.push("- Did this player rotate on foot when a vehicle would have been safer or faster?");
    lines.push("- Did they med to full before re-engaging after taking damage?");
    lines.push("- How much time did they spend in vulnerable positions (blue zone, under fire without moving)?");
    lines.push("- What are the top tactical improvements beyond aim?");

    return lines.join("\n");
  }

  private capitalizeStyle(style: string): string {
    return style.charAt(0).toUpperCase() + style.slice(1);
  }

  private capitalizeCategory(category: string): string {
    const map: Record<string, string> = {
      aim: "Aim Analysis",
      weapons: "Weapon Analysis",
      tactics: "Tactical Analysis",
      combat: "Combat Analysis",
    };
    return map[category] ?? category;
  }

  private getStarRating(score: number): string {
    if (score >= 8) return "⭐⭐⭐⭐⭐ Excellent";
    if (score >= 5) return "⭐⭐⭐⭐ Good";
    if (score >= 3) return "⭐⭐⭐ Average";
    if (score >= 1.5) return "⭐⭐ Below Average";
    return "⭐ Poor";
  }

  private identifyStrengths(player: PlayerAnalysis): string[] {
    const strengths: string[] = [];

    if (player.aim.overallAccuracy >= 0.22) {
      strengths.push(
        `Strong accuracy (${formatPercent(player.aim.overallAccuracy)})`,
      );
    }
    if (player.combat.damageRatio > 1.2) {
      strengths.push(
        `Good damage ratio (${formatNumber(player.combat.damageRatio)}x)`,
      );
    }
    if (player.tactics.zonePositioning.insideZonePercent >= 70) {
      strengths.push("Good zone positioning");
    }
    if (player.combat.engagementWinRate >= 0.6) {
      strengths.push(
        `High fight win rate (${formatPercent(player.combat.engagementWinRate)})`,
      );
    }
    if (
      player.combat.combatScore.grade === "S" ||
      player.combat.combatScore.grade === "A"
    ) {
      strengths.push(
        `Excellent combat performance (Grade ${player.combat.combatScore.grade})`,
      );
    }
    if (player.combat.engagementRanges.medium > 0.5) {
      strengths.push("Strong medium-range combat");
    }

    return strengths;
  }

  private identifyImprovements(player: PlayerAnalysis): string[] {
    const improvements: string[] = [];

    if (player.aim.overallAccuracy < 0.15) {
      improvements.push(
        `**Critical:** Accuracy very low (${formatPercent(player.aim.overallAccuracy)}) - practice recoil control`,
      );
    } else if (player.aim.overallAccuracy < 0.2) {
      improvements.push(
        `Accuracy below threshold (${formatPercent(player.aim.overallAccuracy)})`,
      );
    }

    if (player.tactics.zonePositioning.insideZonePercent < 60) {
      improvements.push(
        "Zone positioning needs improvement (spend more time inside safe zone)",
      );
    }

    if (player.tactics.zonePositioning.lateRotations >= 3) {
      improvements.push(
        `Late rotations (${player.tactics.zonePositioning.lateRotations} incidents) - rotate earlier`,
      );
    }

    if (player.tactics.zonePositioning.edgePlayPercent > 40) {
      improvements.push(
        `High-risk edge play (${formatNumber(player.tactics.zonePositioning.edgePlayPercent)}% of time)`,
      );
    }

    if (player.combat.damageRatio < 0.8) {
      improvements.push(
        "Taking more damage than dealing - improve positioning",
      );
    }

    if (
      player.combat.combatScore.grade === "D" ||
      player.combat.combatScore.grade === "F"
    ) {
      improvements.push(
        `Low combat score (Grade ${player.combat.combatScore.grade}) - focus on fundamentals`,
      );
    }

    return improvements;
  }
}
