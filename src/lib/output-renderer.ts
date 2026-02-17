import chalk from "chalk";
import Table from "cli-table3";
import { resolveItemName } from "../constants/items";
import { SquadAnalysis } from "../types";
import {
  formatDistance,
  formatDuration,
  formatNumber,
  formatPercent,
} from "../utils/formatters";

export class OutputRenderer {
  renderTable(analysis: SquadAnalysis): void {
    const players = analysis.players;

    // Header
    console.log("");
    console.log(
      chalk.cyan.bold(
        "╔════════════════════════════════════════════════════════════════╗",
      ),
    );
    console.log(chalk.cyan.bold(`║${this.center("PUBG Match Analysis", 64)}║`));
    if (analysis.mapName) {
      console.log(
        chalk.cyan.bold(`║${this.center(`Map: ${analysis.mapName}`, 64)}║`),
      );
    }
    console.log(
      chalk.cyan.bold(
        `║${this.center(`Players: ${players.map((p) => p.name).join(", ")}`, 64)}║`,
      ),
    );
    console.log(
      chalk.cyan.bold(
        `║${this.center(`${analysis.matchesAnalyzed} Matches Analyzed`, 64)}║`,
      ),
    );
    console.log(
      chalk.cyan.bold(
        "╚════════════════════════════════════════════════════════════════╝",
      ),
    );
    console.log("");

    // Performance summary table
    const headers = ["Metric", ...players.map((p) => p.name)];
    if (players.length > 1) headers.push("Squad Avg");

    const table = new Table({
      head: headers.map((h) => chalk.yellow.bold(h)),
      style: { head: [], border: [] },
    });

    const avgPlacement = players.map((p) => p.avgStats.winPlace.toFixed(1));
    const avgKills = players.map((p) => p.avgStats.kills.toFixed(1));
    const avgDamage = players.map((p) =>
      Math.round(p.avgStats.damageDealt).toString(),
    );
    const avgSurvival = players.map((p) =>
      formatDuration(p.avgStats.survivalTime),
    );
    const accuracy = players.map((p) => formatPercent(p.aim.overallAccuracy));
    const grade = players.map((p) =>
      this.colorGrade(p.combat.combatScore.grade),
    );

    table.push(
      [
        "Avg Placement",
        ...avgPlacement,
        ...(players.length > 1
          ? [this.squadAvg(players.map((p) => p.avgStats.winPlace))]
          : []),
      ],
      [
        "Avg Kills",
        ...avgKills,
        ...(players.length > 1
          ? [this.squadAvg(players.map((p) => p.avgStats.kills))]
          : []),
      ],
      [
        "Damage/Match",
        ...avgDamage,
        ...(players.length > 1
          ? [
              Math.round(
                analysis.squadStats.avgDamage / players.length,
              ).toString(),
            ]
          : []),
      ],
      [
        "Survival Time",
        ...avgSurvival,
        ...(players.length > 1
          ? [formatDuration(analysis.squadStats.avgSurvivalTime)]
          : []),
      ],
      [
        "Accuracy",
        ...accuracy,
        ...(players.length > 1
          ? [
              formatPercent(
                players.reduce((s, p) => s + p.aim.overallAccuracy, 0) /
                  players.length,
              ),
            ]
          : []),
      ],
      ["Combat Grade", ...grade, ...(players.length > 1 ? [""] : [])],
    );

    console.log(table.toString());
    console.log("");

    // Kill feed
    const hasKillFeed = players.some(
      (p) => p.killFeed && p.killFeed.length > 0,
    );
    if (hasKillFeed) {
      console.log(chalk.hex("#FF6600").bold("💀 KILL FEED"));
      const matchStart = analysis.dateRange.start
        ? new Date(analysis.dateRange.start).getTime()
        : 0;

      for (const player of players) {
        if (!player.killFeed || player.killFeed.length === 0) continue;
        console.log(
          `  ${chalk.bold(player.name)} (${player.killFeed.length} kills):`,
        );

        const killTable = new Table({
          head: ["Time", "Victim", "Weapon", "Distance", ""].map((h) =>
            chalk.yellow(h),
          ),
          style: { head: [], border: [] },
        });

        for (const kill of player.killFeed) {
          const killTime = new Date(kill.timestamp).getTime();
          const elapsed =
            matchStart > 0
              ? Math.max(0, Math.floor((killTime - matchStart) / 1000))
              : 0;
          const timeStr = elapsed > 0 ? formatDuration(elapsed) : "--:--";
          const hsTag = kill.headshot ? chalk.red(" HS") : "";

          killTable.push([
            timeStr,
            kill.victim,
            chalk.cyan(kill.weapon),
            formatDistance(kill.distance * 100), // formatDistance expects cm
            hsTag,
          ]);
        }
        console.log(killTable.toString());
        console.log("");
      }
    }

    // Aim analysis
    console.log(chalk.green.bold("🎯 AIM ANALYSIS"));
    for (const player of players) {
      const bestWeapon = player.aim.bestWeapon;
      const bestAcc = formatPercent(player.aim.bestWeaponAccuracy);
      const bestKills = player.aim.weaponBreakdown[bestWeapon]?.kills ?? 0;
      console.log(
        `  ${chalk.bold(player.name)} - Best Weapon: ${chalk.cyan(bestWeapon)} (${bestAcc} accuracy, ${bestKills} kills)`,
      );
      console.log(
        `    Overall accuracy: ${formatPercent(player.aim.overallAccuracy)} | Headshot rate: ${formatPercent(player.aim.headshotRate)}`,
      );
    }
    console.log("");

    // Weapon analysis — only show weapons that got kills (relevant breakdown)
    console.log(chalk.red.bold("🔫 WEAPON CHOICES"));
    for (const player of players) {
      const withKills = player.weapons.rankings.filter((r) => r.kills >= 1);
      const rankings = withKills.slice(0, 3);
      if (rankings.length > 0) {
        const topWeapons = rankings
          .map((r) => `${r.weapon}(${r.kills}k)`)
          .join(", ");
        console.log(
          `  ${chalk.bold(player.name)} - Top weapons: ${chalk.cyan(topWeapons)}`,
        );
        const best = rankings[0];
        if (best.recommendation === "Keep using") {
          console.log(
            `    ${chalk.green("✓")} ${best.weapon}: Effective (score: ${best.effectivenessScore.toFixed(1)})`,
          );
        }
        const worst = rankings[rankings.length - 1];
        if (worst.kills < 2 && worst.weapon !== best.weapon) {
          console.log(
            `    ${chalk.yellow("!")} ${worst.weapon}: Underperforming (${worst.kills} kills)`,
          );
        }
      } else if (player.weapons.rankings.length > 0) {
        console.log(
          `  ${chalk.bold(player.name)} - No kills with tracked weapons this session`,
        );
      }
    }
    console.log("");

    // Tactical analysis
    console.log(chalk.blue.bold("🗺️  TACTICAL ANALYSIS"));
    for (const player of players) {
      const zone = player.tactics.zonePositioning;
      const insideColor =
        zone.insideZonePercent >= 70
          ? chalk.green
          : zone.insideZonePercent >= 60
            ? chalk.yellow
            : chalk.red;
      const lateColor =
        zone.lateRotations <= 1
          ? chalk.green
          : zone.lateRotations <= 2
            ? chalk.yellow
            : chalk.red;

      console.log(`  ${chalk.bold(player.name)}`);
      console.log(
        `    Zone inside: ${insideColor(formatNumber(zone.insideZonePercent) + "%")} | Edge play: ${formatNumber(zone.edgePlayPercent)}% | Late rotations: ${lateColor(zone.lateRotations.toString())}`,
      );
      console.log(
        `    Playstyle: ${chalk.cyan(player.tactics.movementStyle)} | Hot drop: ${formatPercent(player.tactics.hotDropFrequency)}`,
      );
      const tacticExtras: string[] = [];
      if (player.tactics.vehicleUsage) {
        tacticExtras.push(`Vehicle ratio: ${formatPercent(player.tactics.vehicleUsage.vehicleUsageRatio)}`);
      }
      if (player.tactics.vulnerablePositioning) {
        tacticExtras.push(`Time in blue: ${formatNumber(player.tactics.vulnerablePositioning.timeInBlueZoneSeconds)}s`);
        if (player.tactics.vulnerablePositioning.underFireWithoutMovingCount > 0) {
          tacticExtras.push(`Under fire w/o moving: ${player.tactics.vulnerablePositioning.underFireWithoutMovingCount}`);
        }
      }
      if (player.tactics.healingDiscipline && (player.tactics.healingDiscipline.engagementsAtFullHealthCount > 0 || player.tactics.healingDiscipline.engagementsAtLowHealthCount > 0)) {
        tacticExtras.push(`Engagements full/low health: ${player.tactics.healingDiscipline.engagementsAtFullHealthCount}/${player.tactics.healingDiscipline.engagementsAtLowHealthCount}`);
      }
      if (tacticExtras.length > 0) {
        console.log(`    ${tacticExtras.join(" | ")}`);
      }
    }
    console.log("");

    // Combat analysis
    console.log(chalk.magenta.bold("⚔️  COMBAT EFFECTIVENESS"));
    for (const player of players) {
      const combat = player.combat;
      const ratioColor =
        combat.damageRatio > 1
          ? chalk.green
          : combat.damageRatio > 0.8
            ? chalk.yellow
            : chalk.red;
      const dominantRange = Object.entries(combat.engagementRanges).sort(
        (a, b) => b[1] - a[1],
      )[0];

      console.log(`  ${chalk.bold(player.name)}`);
      console.log(
        `    Damage ratio: ${ratioColor(formatNumber(combat.damageRatio) + "x")} | KDA: ${formatNumber(combat.combatScore.kda)} | Grade: ${this.colorGrade(combat.combatScore.grade)}`,
      );
      if (dominantRange) {
        console.log(
          `    Preferred range: ${chalk.cyan(dominantRange[0])} (${formatPercent(dominantRange[1])} of fights)`,
        );
      }
    }
    console.log("");

    // Survival & damage: consumables, damage received, body part breakdown
    const hasSurvivalData = players.some(
      (p) =>
        (p.consumablesUsed && p.consumablesUsed.length > 0) ||
        (p.damageReceived && p.damageReceived.length > 0) ||
        (p.bodyPartBreakdown && Object.keys(p.bodyPartBreakdown).length > 0),
    );
    if (hasSurvivalData) {
      console.log(chalk.hex("#8B7355").bold("🩹 SURVIVAL & DAMAGE"));
      for (const player of players) {
        if (
          (player.consumablesUsed?.length ?? 0) === 0 &&
          (player.damageReceived?.length ?? 0) === 0 &&
          !(
            player.bodyPartBreakdown &&
            Object.keys(player.bodyPartBreakdown).length > 0
          )
        ) {
          continue;
        }
        console.log(`  ${chalk.bold(player.name)}`);

        if (player.consumablesUsed && player.consumablesUsed.length > 0) {
          const consTable = new Table({
            head: ["Item", "Uses", "Heal"].map((h) => chalk.yellow(h)),
            style: { head: [], border: [] },
          });
          for (const c of player.consumablesUsed) {
            consTable.push([
              resolveItemName(c.itemId),
              c.count.toString(),
              c.healamount != null ? Math.round(c.healamount).toString() : "—",
            ]);
          }
          console.log("    Consumables used:");
          console.log(consTable.toString());
        }

        if (player.damageReceived && player.damageReceived.length > 0) {
          const drTable = new Table({
            head: ["Attacker", "Damage", "Hits"].map((h) => chalk.yellow(h)),
            style: { head: [], border: [] },
          });
          for (const e of player.damageReceived) {
            drTable.push([
              e.attacker,
              Math.round(e.damage).toString(),
              e.hits.toString(),
            ]);
          }
          console.log("    Damage received:");
          console.log(drTable.toString());
        }

        if (
          player.bodyPartBreakdown &&
          Object.keys(player.bodyPartBreakdown).length > 0
        ) {
          const partEntries = Object.entries(player.bodyPartBreakdown).sort(
            (a, b) => b[1].damage - a[1].damage,
          );
          const partTable = new Table({
            head: ["Body part", "Damage received", "Hits"].map((h) =>
              chalk.yellow(h),
            ),
            style: { head: [], border: [] },
          });
          for (const [reason, v] of partEntries) {
            partTable.push([
              reason,
              Math.round(v.damage).toString(),
              v.hits.toString(),
            ]);
          }
          console.log("    Damage received by body part:");
          console.log(partTable.toString());
        }
      }
      console.log("");
    }

    // Insights
    const highInsights = analysis.insights.filter((i) => i.severity === "high");
    const medInsights = analysis.insights.filter(
      (i) => i.severity === "medium",
    );

    if (highInsights.length > 0) {
      console.log(chalk.red.bold("🚨 CRITICAL ISSUES"));
      for (const insight of highInsights) {
        console.log(
          `  ${chalk.red("▶")} ${chalk.bold(insight.player)}: ${insight.message}`,
        );
        console.log(`    ${chalk.yellow("→")} ${insight.recommendation}`);
      }
      console.log("");
    }

    if (medInsights.length > 0) {
      console.log(chalk.yellow.bold("⚠️  AREAS FOR IMPROVEMENT"));
      for (const insight of medInsights) {
        console.log(
          `  ${chalk.yellow("▶")} ${chalk.bold(insight.player)}: ${insight.message}`,
        );
        console.log(`    ${chalk.gray("→")} ${insight.recommendation}`);
      }
      console.log("");
    }
  }

  renderVerbose(analysis: SquadAnalysis): void {
    this.renderTable(analysis);

    console.log(
      chalk.white.bold(
        "═══════════════════ DETAILED WEAPON BREAKDOWN ═══════════════════",
      ),
    );
    for (const player of analysis.players) {
      console.log(
        `\n${chalk.bold.underline(player.name)}'s Weapon Performance:`,
      );
      if (player.weapons.rankings.length === 0) {
        console.log("  No weapon data available");
        continue;
      }

      const weaponTable = new Table({
        head: [
          "Weapon",
          "Kills",
          "Damage",
          "Accuracy",
          "Avg Range",
          "Score",
        ].map((h) => chalk.yellow(h)),
      });

      for (const w of player.weapons.rankings) {
        weaponTable.push([
          w.weapon,
          w.kills.toString(),
          Math.round(w.damage).toString(),
          formatPercent(w.accuracy),
          `${w.avgDistance.toFixed(0)}m`,
          w.effectivenessScore.toFixed(1),
        ]);
      }

      console.log(weaponTable.toString());
    }
    console.log("");
  }

  renderJSON(analysis: SquadAnalysis): void {
    console.log(JSON.stringify(analysis, null, 2));
  }

  private center(text: string, width: number): string {
    const padTotal = width - text.length;
    const padLeft = Math.floor(padTotal / 2);
    const padRight = padTotal - padLeft;
    return " ".repeat(padLeft) + text + " ".repeat(padRight);
  }

  private squadAvg(values: number[]): string {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return avg.toFixed(1);
  }

  private colorGrade(grade: string): string {
    switch (grade) {
      case "S":
        return chalk.magenta.bold("S");
      case "A":
        return chalk.green.bold("A");
      case "B":
        return chalk.cyan.bold("B");
      case "C":
        return chalk.yellow.bold("C");
      case "D":
        return chalk.red.bold("D");
      case "F":
        return chalk.red.bold("F");
      default:
        return grade;
    }
  }
}
