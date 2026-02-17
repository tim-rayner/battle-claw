#!/usr/bin/env node

import { Command } from "commander";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { runAnalyze } from "../commands/analyze";
import { runMastery } from "../commands/mastery";
import { runPostmortem } from "../commands/postmortem";
import { runStats } from "../commands/stats";
import { ApiClient } from "../lib/api-client";
import { validateApiKey } from "../utils/validators";

// Load .env file
dotenv.config();

// Load optional .pubgrc.json config
let rcConfig: Record<string, unknown> = {};
const rcPath = path.join(process.cwd(), ".pubgrc.json");
if (fs.existsSync(rcPath)) {
  try {
    rcConfig = JSON.parse(fs.readFileSync(rcPath, "utf-8"));
  } catch {
    // Ignore malformed config
  }
}

const defaultPlatform =
  process.env.PUBG_PLATFORM ?? (rcConfig.platform as string) ?? "steam";
const defaultPlayers = (rcConfig.defaultPlayers as string[] | undefined)?.join(
  ",",
);
const rateLimitPerMin = parseInt(process.env.PUBG_RATE_LIMIT ?? "10", 10);

function createApiClient(): ApiClient {
  const apiKey = process.env.PUBG_API_KEY;
  validateApiKey(apiKey);
  return new ApiClient(apiKey!, rateLimitPerMin, true);
}

const program = new Command();

program
  .name("pubg-stats")
  .description("PUBG Stats CLI - Analyze your gameplay performance")
  .version("1.0.0");

// ─── analyze command ────────────────────────────────────────────────────────
program
  .command("analyze")
  .description("Fetch and analyze recent matches for players")
  .option(
    "-p, --players <names>",
    "Comma-separated player names (max 4)",
    defaultPlayers,
  )
  .option("-m, --matches <count>", "Number of recent matches to analyze", "5")
  .option("--mode <mode>", "Filter by game mode: solo, duo, squad")
  .option(
    "--platform <shard>",
    "Platform shard: steam, kakao, psn, xbox",
    defaultPlatform,
  )
  .option(
    "-o, --output <format>",
    "Output format: table, json, context",
    "table",
  )
  .option("-v, --verbose", "Verbose output with detailed stats", false)
  .option("--no-telemetry", "Skip telemetry (faster but less accurate)", false)
  .action(async (opts) => {
    if (!opts.players) {
      console.error(
        "Error: --players is required (or set defaultPlayers in .pubgrc.json)",
      );
      process.exit(1);
    }
    const api = createApiClient();
    await runAnalyze(api, {
      players: opts.players,
      matches: parseInt(opts.matches, 10),
      mode: opts.mode,
      platform: opts.platform,
      output: opts.output as "table" | "json" | "context",
      verbose: opts.verbose,
      noTelemetry: !opts.telemetry,
    });
  });

// ─── postmortem command ──────────────────────────────────────────────────────
program
  .command("postmortem")
  .description("Generate detailed post-mortem for a specific match")
  .option(
    "--match <matchId>",
    "Match ID to analyze (defaults to most recent match for first player)",
  )
  .option(
    "--today",
    "Run postmortem for all of today's matches (calendar day, local time; min 10 min each)",
    false,
  )
  .option(
    "-p, --players <names>",
    "Comma-separated player names to focus on",
    defaultPlayers,
  )
  .option(
    "--focus <aspect>",
    "Focus area: aim, weapons, tactics, combat, all",
    "all",
  )
  .option("--platform <shard>", "Platform shard", defaultPlatform)
  .option(
    "-o, --output <format>",
    "Output format: table, json, context",
    "table",
  )
  .option(
    "-j, --json",
    "Output post-mortem data as JSON (same as -o json)",
    false,
  )
  .action(async (opts) => {
    if (!opts.players) {
      console.error(
        "Error: --players is required (or set defaultPlayers in .pubgrc.json)",
      );
      process.exit(1);
    }
    const output =
      opts.json === true
        ? "json"
        : (opts.output as "table" | "json" | "context");
    const api = createApiClient();
    await runPostmortem(api, {
      match: opts.match,
      today: opts.today === true,
      players: opts.players,
      focus: opts.focus as "aim" | "weapons" | "tactics" | "combat" | "all",
      platform: opts.platform,
      output,
    });
  });

// ─── stats command ───────────────────────────────────────────────────────────
program
  .command("stats")
  .description("Show seasonal and lifetime statistics")
  .option(
    "-p, --players <names>",
    "Comma-separated player names",
    defaultPlayers,
  )
  .option("--season <id>", 'Season ID, "current", or "lifetime"', "current")
  .option("-c, --compare", "Compare players side-by-side", false)
  .option("--platform <shard>", "Platform shard", defaultPlatform)
  .option("-o, --output <format>", "Output format: table, json", "table")
  .action(async (opts) => {
    if (!opts.players) {
      console.error(
        "Error: --players is required (or set defaultPlayers in .pubgrc.json)",
      );
      process.exit(1);
    }
    const api = createApiClient();
    await runStats(api, {
      players: opts.players,
      season: opts.season,
      compare: opts.compare,
      platform: opts.platform,
      output: opts.output as "table" | "json",
    });
  });

// ─── mastery command ─────────────────────────────────────────────────────────
program
  .command("mastery")
  .description("Display weapon mastery statistics")
  .option("-p, --player <name>", "Player name", defaultPlayers?.split(",")[0])
  .option("--weapon <name>", "Filter by specific weapon")
  .option("--top <n>", "Show top N weapons", "10")
  .option("--platform <shard>", "Platform shard", defaultPlatform)
  .option("-o, --output <format>", "Output format: table, json", "table")
  .action(async (opts) => {
    if (!opts.player) {
      console.error(
        "Error: --player is required (or set defaultPlayers in .pubgrc.json)",
      );
      process.exit(1);
    }
    const api = createApiClient();
    await runMastery(api, {
      player: opts.player,
      weapon: opts.weapon,
      top: parseInt(opts.top, 10),
      platform: opts.platform,
      output: opts.output as "table" | "json",
    });
  });

program.parse(process.argv);

// Show help if no command given
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
