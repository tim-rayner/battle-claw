<img width="1280" height="720" alt="image" src="https://github.com/user-attachments/assets/ed5c7e2c-b8a3-4741-b41d-1f27f8208fa0" />

# Battle Claw - PUBG Stats CLI

Battle Claw is a CLI tool that fetches and analyzes PUBG match data to support **tactical coaching and improvement**—covering aim, weapon use, combat effectiveness, and full tactics (map movement, vehicle use, positioning, healing, and rotations). It is designed to be used by **humans and by LLMs**: paste or pipe the `-o context` output into an AI assistant to get structured coaching advice.

## Prerequisites

- Node.js v16+
- A PUBG API key from [developer.pubg.com](https://developer.pubg.com)

## Installation

```bash
# Clone and install
git clone <repo-url> battle-claw
cd battle-claw
npm install

# Build
npm run build
```

For global access, link the CLI:

```bash
npm link
```

## Setup

1. Copy the example env file and add your API key:

```bash
cp .env.example .env
```

Edit `.env` and set your key:

```
PUBG_API_KEY=your_api_key_here
```

2. (Optional) Create a `.pubgrc.json` for default settings:

```bash
cp .pubgrc.json.example .pubgrc.json
```

This lets you set a default platform, player list, match limit, and analytics thresholds. See [Configuration](#configuration) for details.

## Usage

```
pubg-stats <command> [options]
```

Or during development:

```bash
npm run dev -- <command> [options]
```

### Commands

#### `analyze` - Match Analysis

Fetch and analyze recent matches for up to 4 players.

```bash
# Analyze last 5 squad matches
pubg-stats analyze -p "Player1,Player2,Player3,Player4" -m 5 --mode squad

# Individual analysis with JSON output
pubg-stats analyze -p "Player1" -m 10 -o json

# Quick analysis without telemetry (faster)
pubg-stats analyze -p "Player1,Player2" --no-telemetry

# Generate context for LLM coaching (markdown)
pubg-stats analyze -p "Player1,Player2" -m 3 -o context

# Machine-readable output for tools/LLMs
pubg-stats analyze -p "Player1" -m 5 -o json
```

For **LLM consumption**, use `-o context` (markdown) or `-o json` (machine-readable). See [Output formats](#output-formats) and [Using Battle Claw with an LLM](#using-battle-claw-with-an-llm).

| Option                  | Description                          | Default      |
| ----------------------- | ------------------------------------ | ------------ |
| `-p, --players <names>` | Comma-separated player names (max 4) | **required** |
| `-m, --matches <count>` | Number of recent matches             | `5`          |
| `--mode <mode>`         | Filter: `solo`, `duo`, `squad`       | all modes    |
| `--platform <shard>`    | Platform shard                       | `steam`      |
| `-o, --output <format>` | `table`, `json`, or `context`        | `table`      |
| `-v, --verbose`         | Detailed stats output                | `false`      |
| `--no-telemetry`        | Skip telemetry download (faster)     | `false`      |

#### `postmortem` - Single Match or Today's Matches Deep Dive

Generate a detailed post-mortem for a specific match or for all of **today's** matches (aggregated). Report includes aim, weapons, tactics, combat, kill feed, **consumables used**, **damage received** (by attacker), and **damage by body part**.

- **Single match (default):** Omit `--match` to use the most recent match (≥10 min) for the first player, or pass `--match <id>`.
- **Today's matches:** Use `--today` to run postmortem for every match from the **current calendar day in local time** with duration ≥10 minutes. Results are aggregated into one report. JSON/context include `reportMode: "single"` or `"today"` and `matchesAnalyzed`.

```bash
# Full post-mortem (single match; defaults to most recent ≥10 min)
pubg-stats postmortem -p "Player1,Player2"

# Specific match
pubg-stats postmortem --match <matchId> -p "Player1,Player2"

# All of today's matches (calendar day, local time)
pubg-stats postmortem --today -p "Player1"

# Focus on aim analysis only
pubg-stats postmortem --match <matchId> -p "Player1" --focus aim

# Output for LLM: context (markdown) or json
pubg-stats postmortem -p "PlayerName" -o context
```

For **LLM consumption**, use `-o context` or `-o json`. See [Output formats](#output-formats).

| Option                  | Description                                                        | Default                              |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------ |
| `--match <matchId>`     | Match ID to analyze                                                | most recent ≥10 min for first player |
| `--today`               | All of today's matches (calendar day, local time; min 10 min each) | `false`                              |
| `-p, --players <names>` | Player names to focus on                                           | **required**                         |
| `--focus <aspect>`      | `aim`, `weapons`, `tactics`, `combat`, `all`                       | `all`                                |
| `--platform <shard>`    | Platform shard                                                     | `steam`                              |
| `-o, --output <format>` | `table`, `json`, or `context`                                      | `table`                              |

#### `stats` - Season & Lifetime Stats

Show seasonal or lifetime statistics with optional player comparison.

```bash
# Current season stats
pubg-stats stats -p "Player1,Player2" --season current

# Lifetime stats, side-by-side comparison
pubg-stats stats -p "Player1,Player2" --season lifetime -c

# JSON output
pubg-stats stats -p "Player1" -o json
```

| Option                  | Description                         | Default      |
| ----------------------- | ----------------------------------- | ------------ |
| `-p, --players <names>` | Comma-separated player names        | **required** |
| `--season <id>`         | Season ID, `current`, or `lifetime` | `current`    |
| `-c, --compare`         | Compare players side-by-side        | `false`      |
| `--platform <shard>`    | Platform shard                      | `steam`      |
| `-o, --output <format>` | `table` or `json`                   | `table`      |

#### `mastery` - Weapon Mastery

Display weapon mastery statistics for a player.

```bash
# Top 10 weapons
pubg-stats mastery -p "Player1"

# Specific weapon stats
pubg-stats mastery -p "Player1" --weapon AKM

# Top 5 weapons as JSON
pubg-stats mastery -p "Player1" --top 5 -o json
```

| Option                  | Description               | Default      |
| ----------------------- | ------------------------- | ------------ |
| `-p, --player <name>`   | Player name               | **required** |
| `--weapon <name>`       | Filter by specific weapon | all weapons  |
| `--top <n>`             | Show top N weapons        | `10`         |
| `--platform <shard>`    | Platform shard            | `steam`      |
| `-o, --output <format>` | `table` or `json`         | `table`      |

## Output Formats

- **table** – Human-readable colored terminal output with insights and recommendations.
- **json** – Machine-readable JSON. Contains the full analysis: aim, weapons, tactics (including vehicle usage, vulnerable positioning, healing discipline, rotation quality), combat, kill feed, consumables used, damage received, body part breakdown, and insights. Use this when piping to another tool or when an LLM expects structured data. The shape follows the types in `src/types/index.ts` (e.g. `players[].tactics.vehicleUsage`, `players[].tactics.vulnerablePositioning`, etc.).
- **context** – Markdown optimized for pasting into an LLM. Sections include: Match Performance Summary, Individual Performance (per player), Kill Feed, Consumables, Damage Received, Body Part, Tactical Profile, **Vehicle usage**, **Vulnerable positioning**, **Healing discipline**, **Rotation quality**, Key Insights, and **Suggested prompts for AI**. Use `-o context` for coaching workflows.

## Analytics and metrics reference

Definitions and how to interpret the main metrics (same names appear in JSON and context output).

### Aim

- **Overall accuracy** – Hits / shots across all weapons.
- **Headshot rate** – Proportion of kills that were headshots.
- **Per-weapon accuracy** – Hits and shots per weapon; use to see which guns the player controls best.

### Weapons

- **Effectiveness** – Score combining kills, damage, engagement distance, and accuracy per weapon.
- **Rankings** – Weapons ordered by effectiveness.
- **Recommendation** – Short text suggestion per weapon.

### Tactics

- **Zone positioning** – Percent of time inside safe zone, on the edge (outer 25%), or in the center (inner 25%); average distance to zone center.
- **Late rotations** – Number of times the player entered the safe zone after it had already started closing significantly (zone radius &lt; 200 m).
- **Movement style** – `aggressive`, `passive`, or `moderate` from movement and zone play.
- **Vehicle usage ratio** – `rideDistance / (rideDistance + walkDistance)`; 0 = all on foot, 1 = all in vehicle.
- **Time in vehicle / on foot** – From telemetry (vehicle ride/leave or position.vehicle) when available.
- **Long foot segments during rotations** – Count of long on-foot moves while outside zone or during rotation; high walk vs low ride may suggest underuse of vehicles.
- **Time in blue zone** – Seconds and percent of match spent outside the safe zone (vulnerable to gas).
- **Under fire without moving** – Count (and optionally time) of damage events where the player moved very little since the previous damage; indicates staying in a bad position under fire.
- **Healing discipline** – **Engagements at full health** vs **engagements at low health**: how many times the player took damage or died after being at ≥90% health vs below. Good discipline = more engagements at full health.
- **Rotation quality** – **Time in gas** (same as time in blue zone); **foot vs vehicle distance during rotations** (distance traveled on foot vs in vehicle while outside zone or rotating).

### Combat

- **Damage dealt / taken** – From telemetry when available.
- **Engagement win rate** – Proportion of engagements (kills vs deaths) won.
- **Combat grade** – S through F from KDA, damage ratio, and kills.
- **Engagement ranges** – Proportion of fights at close, medium, long, and extreme range.

### Other

- **Kill feed** – Per-kill victim, weapon, distance, headshot, timestamp.
- **Consumables used** – Items used (heals, boosts, etc.) with counts and heal amounts.
- **Damage received** – Per attacker: total damage and hit count.
- **Body part breakdown** – Damage and hits by body part / damage reason (e.g. HeadShot, Torso).

## Using Battle Claw with an LLM

Battle Claw is built so an LLM (or another tool) can consume its output for coaching.

**Recommended invocation for coaching**

- Single match: `pubg-stats postmortem -p "PlayerName" -o context`
- Multiple matches: `pubg-stats analyze -p "Player1,Player2" -m 5 -o context`

**How to use the output**

- Paste the **context** output into your AI assistant and ask for tactical improvements.
- Or pipe to a tool that sends the text to an LLM (e.g. `pubg-stats postmortem -p "PlayerName" -o context | your-llm-tool`).
- Use **json** when your pipeline expects structured data; all analytics (including the new tactical fields) are in the serialized object.

**Example user prompt**

After pasting the context (or attaching the JSON), you can ask:

> Using this PUBG match analysis, give me concrete tactical improvements for [PlayerName], not just aim. Cover movement, positioning, healing, and rotations.

The context output includes a **Suggested prompts for AI** section with questions the model can use to structure its answer (e.g. vehicle use, healing before re-engage, time in vulnerable positions, top tactical improvements beyond aim).

## Configuration

### Environment Variables (`.env`)

| Variable          | Required | Description                 | Default               |
| ----------------- | -------- | --------------------------- | --------------------- |
| `PUBG_API_KEY`    | Yes      | Your PUBG API key           | -                     |
| `PUBG_PLATFORM`   | No       | Default platform shard      | `steam`               |
| `PUBG_CACHE_DIR`  | No       | Cache directory path        | `~/.pubg-stats/cache` |
| `PUBG_RATE_LIMIT` | No       | Max API requests per minute | `10`                  |

### Config File (`.pubgrc.json`)

Place a `.pubgrc.json` in the working directory for persistent defaults:

```json
{
  "platform": "steam",
  "defaultPlayers": ["Player1", "Player2", "Player3", "Player4"],
  "matchLimit": 10,
  "caching": {
    "enabled": true,
    "ttl": 3600
  },
  "analytics": {
    "minAccuracyThreshold": 0.15,
    "engagementRanges": {
      "close": [0, 50],
      "medium": [50, 150],
      "long": [150, 300],
      "extreme": [300, 1000]
    }
  }
}
```

### Supported Platforms

| Shard   | Platform    |
| ------- | ----------- |
| `steam` | PC (Steam)  |
| `kakao` | PC (Kakao)  |
| `psn`   | PlayStation |
| `xbox`  | Xbox        |

## Analytics overview

When telemetry is available, Battle Claw analyzes:

- **Aim** – Per-weapon accuracy, headshot rate, hit/shot counts.
- **Weapons** – Effectiveness, rankings, recommendations.
- **Tactics** – Zone positioning, late rotations, movement style, vehicle usage, time in blue zone, under fire without moving, healing discipline, rotation quality (see [Analytics and metrics reference](#analytics-and-metrics-reference)).
- **Combat** – K/D/A, damage dealt vs taken, engagement win rate, combat grade (S–F).

## Project Structure

```
battle-claw/
├── src/
│   ├── bin/pubg-stats.ts            # CLI entry point
│   ├── commands/
│   │   ├── analyze.ts               # analyze command
│   │   ├── postmortem.ts            # postmortem command
│   │   ├── stats.ts                 # stats command
│   │   └── mastery.ts               # mastery command
│   ├── lib/
│   │   ├── api-client.ts            # HTTP client with rate limiting & caching
│   │   ├── analyzer.ts              # Orchestrates analysis pipeline
│   │   ├── context-builder.ts       # Formats output for AI consumption
│   │   ├── insight-generator.ts     # Generates actionable insights
│   │   ├── output-renderer.ts       # Table & formatted output
│   │   ├── analytics/
│   │   │   ├── aim-analyzer.ts      # Accuracy & headshot analysis
│   │   │   ├── weapon-analyzer.ts   # Weapon effectiveness ranking
│   │   │   ├── tactical-analyzer.ts # Zone & rotation analysis
│   │   │   └── combat-analyzer.ts   # K/D/A & damage analysis
│   │   └── services/
│   │       ├── player-service.ts    # Player lookup & season stats
│   │       ├── match-service.ts     # Match fetching & filtering
│   │       └── telemetry-service.ts # Telemetry download & parsing
│   ├── utils/
│   │   ├── rate-limiter.ts          # API rate limiting
│   │   ├── cache-manager.ts         # In-memory caching
│   │   ├── validators.ts            # Input validation
│   │   └── formatters.ts            # Display formatting helpers
│   ├── constants/
│   │   ├── platforms.ts
│   │   ├── weapons.ts
│   │   └── maps.ts
│   └── types/index.ts               # TypeScript type definitions
├── .env.example
├── .pubgrc.json.example
├── package.json
└── tsconfig.json
```

## Development

```bash
# Run in development mode (ts-node)
npm run dev -- analyze -p "Player1" -m 3

# Build TypeScript
npm run build

# Run built version
npm start -- analyze -p "Player1" -m 3

# Run tests
npm test

# Lint
npm run lint
```

## API Notes

- The PUBG API retains match data for **14 days** only. Older matches cannot be retrieved.
- Default rate limit is **10 requests per minute**. Telemetry CDN requests are not rate-limited.
- Telemetry files can be large. Use `--no-telemetry` for faster results when deep analysis isn't needed.

## License

MIT
