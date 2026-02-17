# Battle Claw - PUBG Stats CLI

A lightweight CLI tool that fetches and analyzes PUBG game statistics, providing actionable post-mortem insights on aim accuracy, weapon choices, combat effectiveness, and map rotation tactics.

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

# Generate context for AI post-mortem
pubg-stats analyze -p "Player1,Player2" -m 3 -o context
```

| Option | Description | Default |
|---|---|---|
| `-p, --players <names>` | Comma-separated player names (max 4) | **required** |
| `-m, --matches <count>` | Number of recent matches | `5` |
| `--mode <mode>` | Filter: `solo`, `duo`, `squad` | all modes |
| `--platform <shard>` | Platform shard | `steam` |
| `-o, --output <format>` | `table`, `json`, or `context` | `table` |
| `-v, --verbose` | Detailed stats output | `false` |
| `--no-telemetry` | Skip telemetry download (faster) | `false` |

#### `postmortem` - Single Match Deep Dive

Generate a detailed post-mortem for a specific match.

```bash
# Full post-mortem
pubg-stats postmortem --match <matchId> -p "Player1,Player2"

# Focus on aim analysis only
pubg-stats postmortem --match <matchId> -p "Player1" --focus aim
```

| Option | Description | Default |
|---|---|---|
| `--match <matchId>` | Match ID to analyze | **required** |
| `-p, --players <names>` | Player names to focus on | **required** |
| `--focus <aspect>` | `aim`, `weapons`, `tactics`, `combat`, `all` | `all` |
| `--platform <shard>` | Platform shard | `steam` |
| `-o, --output <format>` | `table`, `json`, or `context` | `table` |

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

| Option | Description | Default |
|---|---|---|
| `-p, --players <names>` | Comma-separated player names | **required** |
| `--season <id>` | Season ID, `current`, or `lifetime` | `current` |
| `-c, --compare` | Compare players side-by-side | `false` |
| `--platform <shard>` | Platform shard | `steam` |
| `-o, --output <format>` | `table` or `json` | `table` |

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

| Option | Description | Default |
|---|---|---|
| `-p, --player <name>` | Player name | **required** |
| `--weapon <name>` | Filter by specific weapon | all weapons |
| `--top <n>` | Show top N weapons | `10` |
| `--platform <shard>` | Platform shard | `steam` |
| `-o, --output <format>` | `table` or `json` | `table` |

## Output Formats

- **table** - Colored terminal tables with insights and recommendations
- **json** - Machine-readable JSON with full stats, weapon breakdowns, and insights
- **context** - Markdown formatted for feeding into an AI assistant for coaching

## Configuration

### Environment Variables (`.env`)

| Variable | Required | Description | Default |
|---|---|---|---|
| `PUBG_API_KEY` | Yes | Your PUBG API key | - |
| `PUBG_PLATFORM` | No | Default platform shard | `steam` |
| `PUBG_CACHE_DIR` | No | Cache directory path | `~/.pubg-stats/cache` |
| `PUBG_RATE_LIMIT` | No | Max API requests per minute | `10` |

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

| Shard | Platform |
|---|---|
| `steam` | PC (Steam) |
| `kakao` | PC (Kakao) |
| `psn` | PlayStation |
| `xbox` | Xbox |

## Analytics

Battle Claw performs deep analysis across four dimensions when telemetry is available:

- **Aim Analysis** - Per-weapon accuracy, headshot rate, hit/shot counts
- **Weapon Effectiveness** - Kill efficiency, damage per kill, engagement distance, loadout recommendations
- **Tactical Analysis** - Zone positioning (inside/edge/center), rotation timing, movement patterns
- **Combat Effectiveness** - K/D/A ratios, damage dealt vs taken, engagement win rate, combat grade (S through F)

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
