# Software Design Document: OpenClaw PUBG Stats CLI

## 1. Executive Summary

### 1.1 Purpose
A lightweight JavaScript CLI tool that fetches and analyzes PUBG game statistics for up to 4 players (squad size), providing actionable post-mortem insights on gameplay performance including aim accuracy, weapon choices, and map rotation tactics.

### 1.2 Target Platform
- OpenClaw machine environment
- Node.js runtime (v16+)
- Cross-platform compatibility (Windows, macOS, Linux)

### 1.3 Key Features
- Track individual player or squad performance
- Fetch recent match history (14-day retention window)
- Deep telemetry analysis for tactical insights
- AI-assisted post-mortem analysis
- Minimal dependencies for lightweight deployment

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Interface Layer                      │
│  (Commander.js - argument parsing, user interaction)         │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   Service Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Player Svc   │  │  Match Svc   │  │ Telemetry Svc│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   API Client Layer                           │
│  (Axios + gzip support, rate limiting, caching)             │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    PUBG REST API                             │
│  https://api.pubg.com/shards/{platform}/...                 │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Component Breakdown

#### 2.2.1 CLI Interface (`cli.js`)
- Entry point for the application
- Argument parsing and validation
- Command routing
- Output formatting (tables, JSON, colored terminal output)

#### 2.2.2 API Client (`lib/api-client.js`)
- HTTP client wrapper with:
  - Authentication header management
  - Rate limiting (10 requests/minute)
  - GZIP decompression support
  - Error handling and retry logic
  - Response caching for 14-day retention awareness

#### 2.2.3 Service Layer
**PlayerService** (`lib/services/player-service.js`)
- Fetch player account IDs by username
- Retrieve season stats, lifetime stats
- Get weapon/survival mastery data
- Squad aggregation logic

**MatchService** (`lib/services/match-service.js`)
- Fetch match details
- Filter recent matches (14-day window)
- Extract match metadata and participant stats
- Locate telemetry asset URLs

**TelemetryService** (`lib/services/telemetry-service.js`)
- Download and decompress telemetry data
- Parse telemetry events
- Filter events by type and player
- Event aggregation and analysis

#### 2.2.4 Analytics Engine (`lib/analytics/`)
**AimAnalyzer** (`aim-analyzer.js`)
- Calculate accuracy: hits / total shots fired
- Track weapon-specific performance
- Identify accuracy trends across matches
- Headshot percentage analysis

**WeaponAnalyzer** (`weapon-analyzer.js`)
- Track weapon pickup/usage patterns
- Analyze kill efficiency per weapon
- Compare weapon performance vs squad average
- Recommend optimal loadouts

**TacticalAnalyzer** (`tactical-analyzer.js`)
- Map rotation analysis from LogPlayerPosition
- Zone positioning effectiveness
- Movement patterns and hot-drop analysis
- Engagement positioning (cover, elevation)

**CombatAnalyzer** (`combat-analyzer.js`)
- Damage dealt vs damage taken ratio
- Kill/Death/Assist ratios
- Time-to-kill analysis
- Combat engagement outcomes

#### 2.2.5 Context Builder (`lib/context-builder.js`)
- Aggregates all analysis data
- Formats data for LLM consumption
- Builds comprehensive context for AI post-mortem

---

## 3. Data Flow

### 3.1 Typical Execution Flow

```
1. User runs CLI command:
   $ pubg-stats analyze --players "Player1,Player2" --matches 5

2. CLI validates input and authenticates

3. PlayerService fetches account IDs for players

4. MatchService retrieves last 5 matches for each player

5. For each match:
   a. Fetch match details
   b. Extract telemetry URL from assets
   c. Download and parse telemetry data
   d. Run analytics on telemetry events

6. Analytics Engine processes:
   - Aim data (LogPlayerAttack, LogWeaponFireCount)
   - Weapon choices (LogItemPickup, LogItemEquip)
   - Movement (LogPlayerPosition)
   - Combat events (LogPlayerKillV2, LogPlayerTakeDamage)

7. ContextBuilder aggregates findings

8. Output results to terminal (or OpenClaw context)
```

---

## 4. API Integration Details

### 4.1 PUBG API Endpoints Used

#### Players Endpoint
```
GET https://api.pubg.com/shards/{platform}/players?filter[playerNames]={names}
```
- Returns player account IDs and recent match references
- Used for: Initial player lookup
- Rate limit impact: 1 call per query

#### Match Endpoint
```
GET https://api.pubg.com/shards/{platform}/matches/{matchId}
```
- Returns match metadata and participant stats
- Contains telemetry asset URL
- Used for: Match details and telemetry URL extraction
- Rate limit impact: 1 call per match

#### Telemetry CDN
```
GET https://telemetry-cdn.pubg.com/.../{telemetry-id}.json
```
- No API key required
- GZIP compressed JSON array of events
- Used for: Detailed match telemetry
- Rate limit impact: 0 (doesn't count against API limit)

#### Season Stats Endpoint
```
GET https://api.pubg.com/shards/{platform}/players/{accountId}/seasons/{seasonId}
```
- Returns seasonal statistics
- Used for: Overall performance context
- Rate limit impact: 1 call per player

#### Weapon Mastery Endpoint
```
GET https://api.pubg.com/shards/{platform}/players/{accountId}/weapon_mastery
```
- Returns weapon-specific mastery stats
- Used for: Weapon performance baseline
- Rate limit impact: 1 call per player

### 4.2 Authentication
```javascript
headers: {
  'Authorization': `Bearer ${process.env.PUBG_API_KEY}`,
  'Accept': 'application/vnd.api+json',
  'Accept-Encoding': 'gzip'
}
```

### 4.3 Platform Shards
- `steam` - PC Steam
- `kakao` - PC Kakao
- `psn` - PlayStation
- `xbox` - Xbox
- `stadia` - Stadia (deprecated)

Default: `steam` (configurable via CLI args)

---

## 5. Telemetry Events Reference

### 5.1 Critical Events for Analysis

#### LogPlayerAttack
```json
{
  "_D": "2024-01-01T12:00:00.000Z",
  "_T": "LogPlayerAttack",
  "attackId": 123,
  "attacker": { "name": "Player1", "teamId": 1 },
  "attackType": "Weapon",
  "weapon": { "itemId": "Item_Weapon_AKM_C" },
  "vehicle": null,
  "fireWeaponStackCount": 1
}
```
**Used for:** Shot count, weapon usage

#### LogWeaponFireCount
```json
{
  "_D": "2024-01-01T12:00:00.000Z",
  "_T": "LogWeaponFireCount",
  "character": { "name": "Player1" },
  "weaponId": "Item_Weapon_AKM_C",
  "fireCount": 30
}
```
**Used for:** Total shots fired per weapon

#### LogPlayerKillV2
```json
{
  "_D": "2024-01-01T12:00:00.000Z",
  "_T": "LogPlayerKillV2",
  "attackId": 123,
  "killer": { "name": "Player1" },
  "victim": { "name": "Enemy1" },
  "damageReason": "AKM",
  "damageTypeCategory": "Damage_Gun",
  "distance": 45.6,
  "victimGameResult": { "rank": 12 }
}
```
**Used for:** Kill tracking, engagement distance, weapon effectiveness

#### LogPlayerTakeDamage
```json
{
  "_D": "2024-01-01T12:00:00.000Z",
  "_T": "LogPlayerTakeDamage",
  "attackId": 123,
  "attacker": { "name": "Enemy1" },
  "victim": { "name": "Player1" },
  "damageTypeCategory": "Damage_Gun",
  "damageReason": "M416",
  "damage": 23.5,
  "damageCauserName": "M416"
}
```
**Used for:** Damage taken analysis, combat effectiveness

#### LogPlayerPosition
```json
{
  "_D": "2024-01-01T12:00:00.000Z",
  "_T": "LogPlayerPosition",
  "character": { 
    "name": "Player1",
    "location": { "x": 450000, "y": 320000, "z": 1500 }
  },
  "elapsedTime": 1234,
  "numAlivePlayers": 45
}
```
**Used for:** Movement tracking, zone positioning, rotation analysis

#### LogItemPickup / LogItemEquip
```json
{
  "_D": "2024-01-01T12:00:00.000Z",
  "_T": "LogItemEquip",
  "character": { "name": "Player1" },
  "item": { 
    "itemId": "Item_Weapon_AKM_C",
    "category": "Weapon",
    "subCategory": "Main"
  }
}
```
**Used for:** Loadout choices, weapon preference patterns

### 5.2 Event Filtering Strategy

For performance optimization:
1. Stream-parse telemetry JSON (avoid loading entire file into memory)
2. Filter events by relevant player names only
3. Process events in chronological order
4. Aggregate data in-flight (don't store all events)

---

## 6. Configuration

### 6.1 Environment Variables

```bash
# Required
PUBG_API_KEY=your_api_key_here

# Optional
PUBG_PLATFORM=steam                # Default platform
PUBG_CACHE_DIR=~/.pubg-stats/cache # Cache location
PUBG_RATE_LIMIT=10                 # Requests per minute
```

### 6.2 Configuration File (`.pubgrc.json`)

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

---

## 7. CLI Commands & Arguments

### 7.1 Command Structure

```bash
pubg-stats <command> [options]
```

### 7.2 Commands

#### `analyze`
Fetch and analyze recent matches for players

```bash
pubg-stats analyze --players "Player1,Player2,Player3" --matches 5 --mode squad
```

**Arguments:**
- `--players, -p <names>` - Comma-separated player names (max 4)
- `--matches, -m <count>` - Number of recent matches to analyze (default: 5, max: 32)
- `--mode <mode>` - Filter by game mode: solo, duo, squad (optional)
- `--platform <shard>` - Platform shard (default: steam)
- `--output, -o <format>` - Output format: table, json, context (default: table)
- `--squad-only, -s` - Analyze only squad performance (aggregate)
- `--individual, -i` - Analyze individual performance (default)
- `--verbose, -v` - Verbose output with detailed stats

**Examples:**
```bash
# Analyze last 5 squad matches for 4 players
pubg-stats analyze -p "Player1,Player2,Player3,Player4" -m 5 --mode squad

# Individual analysis with JSON output
pubg-stats analyze -p "Player1" -m 10 -o json

# Generate OpenClaw context for AI assistant
pubg-stats analyze -p "Player1,Player2" -m 3 -o context
```

#### `postmortem`
Generate AI-assisted post-mortem for a specific match

```bash
pubg-stats postmortem --match <matchId> --players "Player1,Player2"
```

**Arguments:**
- `--match <matchId>` - Specific match ID to analyze
- `--players, -p <names>` - Player names to focus on
- `--focus <aspect>` - Focus area: aim, weapons, tactics, combat, all (default: all)

#### `stats`
Show seasonal and lifetime statistics

```bash
pubg-stats stats --players "Player1,Player2" --season current
```

**Arguments:**
- `--players, -p <names>` - Player names
- `--season <id>` - Season ID or "current" or "lifetime" (default: current)
- `--compare, -c` - Compare players side-by-side

#### `mastery`
Display weapon mastery statistics

```bash
pubg-stats mastery --player "Player1" --weapon AKM
```

**Arguments:**
- `--player, -p <name>` - Player name
- `--weapon <name>` - Specific weapon filter (optional)
- `--top <n>` - Show top N weapons (default: 10)

---

## 8. Analytics Algorithms

### 8.1 Aim Accuracy Calculation

```javascript
function calculateAimAccuracy(telemetryEvents, playerName) {
  const attacks = telemetryEvents.filter(e => 
    e._T === 'LogPlayerAttack' && 
    e.attacker.name === playerName
  );
  
  const fireCount = telemetryEvents.filter(e => 
    e._T === 'LogWeaponFireCount' && 
    e.character.name === playerName
  );
  
  // Group by weapon
  const weaponStats = {};
  
  attacks.forEach(attack => {
    const weapon = attack.weapon.itemId;
    if (!weaponStats[weapon]) {
      weaponStats[weapon] = { hits: 0, shots: 0 };
    }
    weaponStats[weapon].hits += attack.fireWeaponStackCount || 0;
  });
  
  fireCount.forEach(fc => {
    const weapon = fc.weaponId;
    if (!weaponStats[weapon]) {
      weaponStats[weapon] = { hits: 0, shots: 0 };
    }
    weaponStats[weapon].shots += fc.fireCount;
  });
  
  // Calculate accuracy per weapon
  const results = {};
  for (const [weapon, stats] of Object.entries(weaponStats)) {
    results[weapon] = {
      accuracy: stats.shots > 0 ? (stats.hits / stats.shots) : 0,
      hits: stats.hits,
      shots: stats.shots
    };
  }
  
  return results;
}
```

### 8.2 Combat Effectiveness Score

```javascript
function calculateCombatScore(kills, deaths, assists, damageDealt, damageTaken) {
  const kda = deaths > 0 ? (kills + (assists * 0.5)) / deaths : kills;
  const damageRatio = damageTaken > 0 ? damageDealt / damageTaken : damageDealt;
  
  // Weighted score: 40% KDA, 40% damage ratio, 20% raw kills
  const score = (kda * 0.4) + (damageRatio * 0.4) + (kills * 0.2);
  
  return {
    score,
    kda,
    damageRatio,
    grade: getGrade(score) // S, A, B, C, D, F
  };
}

function getGrade(score) {
  if (score >= 5) return 'S';
  if (score >= 3.5) return 'A';
  if (score >= 2.5) return 'B';
  if (score >= 1.5) return 'C';
  if (score >= 0.8) return 'D';
  return 'F';
}
```

### 8.3 Zone Positioning Analysis

```javascript
function analyzeZonePositioning(positionEvents, gameState) {
  const positions = positionEvents.filter(e => 
    e._T === 'LogPlayerPosition'
  ).sort((a, b) => a.elapsedTime - b.elapsedTime);
  
  const analysis = {
    insideZonePercent: 0,
    edgePlayPercent: 0,
    centerPlayPercent: 0,
    avgDistanceToCenter: 0,
    lateRotations: 0
  };
  
  let totalSamples = 0;
  let insideCount = 0;
  let edgeCount = 0;
  let centerCount = 0;
  
  positions.forEach((pos, idx) => {
    const playerLoc = pos.character.location;
    const zoneCenter = gameState.safetyZonePosition;
    const zoneRadius = gameState.safetyZoneRadius;
    
    const distance = calculateDistance(playerLoc, zoneCenter);
    
    if (distance <= zoneRadius) {
      insideCount++;
      
      // Edge play: within outer 25% of zone
      if (distance > zoneRadius * 0.75) {
        edgeCount++;
      }
      
      // Center play: within inner 25% of zone
      if (distance < zoneRadius * 0.25) {
        centerCount++;
      }
    }
    
    totalSamples++;
  });
  
  analysis.insideZonePercent = (insideCount / totalSamples) * 100;
  analysis.edgePlayPercent = (edgeCount / insideCount) * 100;
  analysis.centerPlayPercent = (centerCount / insideCount) * 100;
  
  return analysis;
}
```

### 8.4 Weapon Effectiveness Ranking

```javascript
function rankWeaponEffectiveness(kills, damage, accuracy) {
  const weapons = {};
  
  // Aggregate data per weapon
  kills.forEach(kill => {
    const weapon = kill.damageReason;
    if (!weapons[weapon]) {
      weapons[weapon] = { kills: 0, damage: 0, avgDistance: 0, distances: [] };
    }
    weapons[weapon].kills++;
    weapons[weapon].distances.push(kill.distance);
  });
  
  damage.forEach(dmg => {
    const weapon = dmg.damageCauserName;
    if (weapons[weapon]) {
      weapons[weapon].damage += dmg.damage;
    }
  });
  
  // Calculate effectiveness score
  const rankings = Object.entries(weapons).map(([weapon, stats]) => {
    const avgDistance = stats.distances.reduce((a, b) => a + b, 0) / stats.distances.length;
    const acc = accuracy[weapon]?.accuracy || 0;
    
    // Score: kills (40%), damage per kill (30%), accuracy (30%)
    const damagePerKill = stats.damage / stats.kills;
    const effectivenessScore = 
      (stats.kills * 0.4) + 
      ((damagePerKill / 100) * 0.3) + 
      (acc * 100 * 0.3);
    
    return {
      weapon,
      kills: stats.kills,
      damage: stats.damage,
      avgDistance,
      accuracy: acc,
      effectivenessScore,
      recommendation: effectivenessScore > 5 ? 'Keep using' : 'Consider alternatives'
    };
  }).sort((a, b) => b.effectivenessScore - a.effectivenessScore);
  
  return rankings;
}
```

---

## 9. Output Formats

### 9.1 Table Output (Terminal)

```
╔════════════════════════════════════════════════════════════════╗
║           PUBG Match Analysis - Player1 & Player2              ║
║                    Last 5 Matches Analyzed                     ║
╚════════════════════════════════════════════════════════════════╝

┌─────────────────────┬───────────┬───────────┬──────────────────┐
│ Metric              │ Player1   │ Player2   │ Squad Avg        │
├─────────────────────┼───────────┼───────────┼──────────────────┤
│ Avg Placement       │ 12.4      │ 15.2      │ 13.8             │
│ Kills               │ 3.2       │ 2.8       │ 3.0              │
│ Damage/Match        │ 387       │ 312       │ 349              │
│ Survival Time       │ 18m 23s   │ 16m 45s   │ 17m 34s          │
│ Overall Accuracy    │ 21.3%     │ 18.7%     │ 20.0%            │
│ Combat Score        │ B         │ C+        │ B-               │
└─────────────────────┴───────────┴───────────┴──────────────────┘

🎯 AIM ANALYSIS
  Player1 - Best Weapon: M416 (27% accuracy, 8 kills)
  Player2 - Best Weapon: AKM (22% accuracy, 6 kills)
  Recommendation: Player2 should practice recoil control on AKM

🔫 WEAPON CHOICES
  Most Effective: M416 (Squad: 14 kills, 892 damage)
  Underperforming: UMP45 (Squad: 2 kills, 156 damage)
  Recommendation: Prioritize AR loadouts, avoid SMG late-game

🗺️  TACTICAL ANALYSIS
  Zone Positioning: 67% inside safe zone (GOOD)
  Edge Play: 34% of time (High risk positioning)
  Late Rotations: 3 incidents (NEEDS IMPROVEMENT)
  Recommendation: Rotate earlier to zone center, reduce edge play

⚔️  COMBAT EFFECTIVENESS
  Damage Ratio: 1.24 (Dealing more than taking - GOOD)
  Engagement Range: 65% medium range (50-150m)
  Win Rate in Engagements: 58%
  Recommendation: Practice long-range engagements, improve positioning
```

### 9.2 JSON Output

```json
{
  "summary": {
    "players": ["Player1", "Player2"],
    "matchesAnalyzed": 5,
    "dateRange": {
      "start": "2024-01-15T00:00:00Z",
      "end": "2024-01-20T00:00:00Z"
    }
  },
  "players": [
    {
      "name": "Player1",
      "stats": {
        "avgPlacement": 12.4,
        "kills": 3.2,
        "deaths": 1.0,
        "assists": 1.4,
        "damagePerMatch": 387,
        "survivalTime": 1103,
        "accuracy": 0.213,
        "combatScore": {
          "score": 2.8,
          "grade": "B",
          "kda": 4.6
        }
      },
      "aim": {
        "overallAccuracy": 0.213,
        "weaponBreakdown": {
          "M416": { "accuracy": 0.27, "hits": 45, "shots": 167, "kills": 8 },
          "AKM": { "accuracy": 0.19, "hits": 32, "shots": 168, "kills": 4 }
        },
        "headshotRate": 0.18
      },
      "weapons": {
        "mostEffective": "M416",
        "effectiveness": {
          "M416": { "kills": 8, "damagePerKill": 112, "score": 6.2 },
          "AKM": { "kills": 4, "damagePerKill": 98, "score": 4.1 }
        }
      },
      "tactics": {
        "zonePositioning": {
          "insideZonePercent": 67,
          "edgePlayPercent": 34,
          "centerPlayPercent": 12,
          "lateRotations": 3
        },
        "movementStyle": "aggressive",
        "hotDropFrequency": 0.6
      },
      "combat": {
        "damageDealt": 1935,
        "damageTaken": 1562,
        "damageRatio": 1.24,
        "engagementRanges": {
          "close": 0.15,
          "medium": 0.65,
          "long": 0.18,
          "extreme": 0.02
        },
        "engagementWinRate": 0.58
      }
    }
  ],
  "insights": [
    {
      "category": "aim",
      "severity": "medium",
      "player": "Player2",
      "message": "Accuracy below 20% threshold. Practice recoil control.",
      "recommendation": "Focus on burst firing with AKM at medium range"
    },
    {
      "category": "tactics",
      "severity": "high",
      "player": "Squad",
      "message": "3+ late zone rotations detected",
      "recommendation": "Plan rotation 30-45 seconds before zone closes"
    },
    {
      "category": "weapons",
      "severity": "low",
      "player": "Squad",
      "message": "UMP45 underperforming",
      "recommendation": "Replace with Vector or MP5K for close quarters"
    }
  ]
}
```

### 9.3 Context Output (OpenClaw Format)

```markdown
# PUBG Match Analysis Context
**Players:** Player1, Player2
**Matches Analyzed:** 5 (Jan 15-20, 2024)
**Platform:** Steam

## Match Performance Summary
- Average Placement: #13.8
- Squad Kills: 15 total (3.0 per match)
- Squad Damage: 1745 per match
- Average Survival: 17m 34s

## Individual Performance

### Player1
**Combat Stats:**
- K/D/A: 3.2 / 1.0 / 1.4 (KDA: 4.6)
- Accuracy: 21.3% overall
- Best Weapon: M416 (27% accuracy, 8 kills)
- Combat Grade: B

**Tactical Profile:**
- Zone positioning: 67% inside safe zone
- Style: Aggressive edge player
- Rotations: 3 late rotations (needs improvement)

**Strengths:**
- Strong medium-range combat (65% of engagements)
- High damage output (387/match)
- Good weapon variety

**Areas for Improvement:**
- Earlier zone rotations
- Reduce edge play risk (34% of time on edge)
- Long-range accuracy (18%)

### Player2
**Combat Stats:**
- K/D/A: 2.8 / 1.0 / 1.2 (KDA: 4.0)
- Accuracy: 18.7% overall
- Best Weapon: AKM (22% accuracy, 6 kills)
- Combat Grade: C+

**Tactical Profile:**
- Zone positioning: 62% inside safe zone
- Style: Moderate/passive
- Rotations: 2 late rotations

**Strengths:**
- Consistent damage (312/match)
- Good survival instincts
- Solid teammate support

**Areas for Improvement:**
- **Critical:** Accuracy below 20% threshold
- AKM recoil control practice needed
- Increase engagement confidence

## Squad Analysis

### Weapon Performance
| Weapon | Squad Kills | Squad Damage | Effectiveness |
|--------|-------------|--------------|---------------|
| M416   | 14          | 892          | ⭐⭐⭐⭐⭐ Excellent |
| AKM    | 10          | 756          | ⭐⭐⭐⭐ Good |
| KAR98k | 4           | 312          | ⭐⭐⭐ Average |
| UMP45  | 2           | 156          | ⭐⭐ Poor |

**Recommendation:** Prioritize M416/AKM loadouts. Avoid UMP45 in favor of Vector.

### Tactical Insights

**Zone Management:**
- Inside zone time: 64.5% (Target: 75%+)
- Late rotations: 5 total across 5 matches (TOO HIGH)
- Edge play: 32% average (HIGH RISK)

**Action Items:**
1. Set rotation timer at zone -45 seconds
2. Aim for zone center when possible
3. Reduce edge camping unless tactically necessary

**Combat Engagement:**
- Squad engagement win rate: 58% (Above average)
- Preferred range: 50-150m medium range
- Damage ratio: 1.21 (Positive trading)

### Post-Mortem: Match #3 (Worst Performance)
**Placement:** #24 (Early exit)
**Issues Identified:**
1. Hot drop at Pecado led to poor loot distribution
2. Late rotation from blue zone caused 156 damage taken
3. Lost engagement at medium range with only SMGs equipped

**What Went Wrong:**
- Poor landing coordination (squad split)
- No AR weapons secured before first rotation
- Forced to fight in open during zone movement

**Recommendations:**
1. Coordinate landing spots to ensure squad cohesion
2. Prioritize AR loot before engaging
3. If under-equipped, rotate early and loot on the way

---

**AI Assistant Prompt:**
Based on this context, help these players understand:
- Why they lost Match #3 and how to avoid similar situations
- Specific drills to improve Player2's aim accuracy
- Better zone rotation strategies for the squad
- When to take fights vs. when to disengage
```

---

## 10. Technical Implementation Details

### 10.1 Dependencies

```json
{
  "dependencies": {
    "commander": "^11.1.0",      // CLI framework
    "axios": "^1.6.2",           // HTTP client
    "chalk": "^5.3.0",           // Terminal colors
    "cli-table3": "^0.6.3",      // Table rendering
    "dotenv": "^16.3.1",         // Environment variables
    "zlib": "built-in",          // GZIP decompression
    "node-cache": "^5.1.2"       // In-memory caching
  },
  "devDependencies": {
    "jest": "^29.7.0",           // Testing
    "eslint": "^8.55.0"          // Linting
  }
}
```

### 10.2 Project Structure

```
pubg-stats-cli/
├── package.json
├── .env.example
├── .pubgrc.json.example
├── README.md
├── bin/
│   └── pubg-stats.js          # CLI entry point (#!/usr/bin/env node)
├── lib/
│   ├── api-client.js          # HTTP client wrapper
│   ├── context-builder.js     # OpenClaw context formatter
│   ├── services/
│   │   ├── player-service.js
│   │   ├── match-service.js
│   │   └── telemetry-service.js
│   ├── analytics/
│   │   ├── aim-analyzer.js
│   │   ├── weapon-analyzer.js
│   │   ├── tactical-analyzer.js
│   │   └── combat-analyzer.js
│   ├── utils/
│   │   ├── rate-limiter.js
│   │   ├── cache-manager.js
│   │   ├── validators.js
│   │   └── formatters.js
│   └── constants/
│       ├── platforms.js
│       ├── weapons.js
│       └── maps.js
├── test/
│   ├── api-client.test.js
│   ├── services/
│   └── analytics/
└── examples/
    ├── output-table.txt
    ├── output-json.json
    └── output-context.md
```

### 10.3 Rate Limiting Implementation

```javascript
// lib/utils/rate-limiter.js
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async waitIfNeeded() {
    const now = Date.now();
    
    // Remove requests outside the window
    this.requests = this.requests.filter(
      time => now - time < this.windowMs
    );

    if (this.requests.length >= this.maxRequests) {
      // Calculate wait time
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest) + 100;
      
      console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Retry
      return this.waitIfNeeded();
    }

    this.requests.push(now);
  }
}
```

### 10.4 Caching Strategy

```javascript
// lib/utils/cache-manager.js
const NodeCache = require('node-cache');

class CacheManager {
  constructor(ttl = 3600) { // 1 hour default TTL
    this.cache = new NodeCache({ 
      stdTTL: ttl,
      checkperiod: 120 
    });
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value, ttl) {
    return this.cache.set(key, value, ttl);
  }

  // Cache keys are namespaced by type
  playerKey(playerName, platform) {
    return `player:${platform}:${playerName}`;
  }

  matchKey(matchId) {
    return `match:${matchId}`;
  }

  telemetryKey(matchId) {
    return `telemetry:${matchId}`;
  }
}

module.exports = CacheManager;
```

---

## 11. Error Handling

### 11.1 API Error Scenarios

```javascript
class PUBGAPIError extends Error {
  constructor(message, statusCode, endpoint) {
    super(message);
    this.name = 'PUBGAPIError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}

// Usage in API client
async function makeRequest(url) {
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          throw new PUBGAPIError(
            'Invalid API key. Check PUBG_API_KEY environment variable.',
            401,
            url
          );
        case 404:
          throw new PUBGAPIError(
            'Resource not found. Player or match may not exist.',
            404,
            url
          );
        case 429:
          throw new PUBGAPIError(
            'Rate limit exceeded. Please wait before retrying.',
            429,
            url
          );
        default:
          throw new PUBGAPIError(
            `API request failed: ${error.message}`,
            error.response.status,
            url
          );
      }
    }
    throw error;
  }
}
```

### 11.2 User-Friendly Error Messages

```javascript
function handleError(error) {
  if (error instanceof PUBGAPIError) {
    switch (error.statusCode) {
      case 401:
        console.error(chalk.red('❌ Authentication failed'));
        console.log(chalk.yellow('💡 Make sure PUBG_API_KEY is set in .env file'));
        console.log(chalk.blue('   Get your API key at: https://developer.pubg.com'));
        break;
      
      case 404:
        console.error(chalk.red('❌ Player or match not found'));
        console.log(chalk.yellow('💡 Check player names for typos'));
        console.log(chalk.yellow('💡 Matches older than 14 days are not available'));
        break;
      
      case 429:
        console.error(chalk.red('❌ Rate limit exceeded'));
        console.log(chalk.yellow('💡 The tool will auto-retry, or wait 60 seconds'));
        break;
      
      default:
        console.error(chalk.red(`❌ API Error: ${error.message}`));
    }
  } else {
    console.error(chalk.red(`❌ Unexpected error: ${error.message}`));
  }
  
  process.exit(1);
}
```

---

## 12. Testing Strategy

### 12.1 Unit Tests

```javascript
// test/analytics/aim-analyzer.test.js
describe('AimAnalyzer', () => {
  describe('calculateAimAccuracy', () => {
    it('should calculate accuracy correctly', () => {
      const events = [
        { _T: 'LogPlayerAttack', attacker: { name: 'Player1' }, 
          weapon: { itemId: 'M416' }, fireWeaponStackCount: 1 },
        { _T: 'LogWeaponFireCount', character: { name: 'Player1' }, 
          weaponId: 'M416', fireCount: 30 }
      ];
      
      const result = calculateAimAccuracy(events, 'Player1');
      
      expect(result.M416.accuracy).toBeCloseTo(0.033, 2);
      expect(result.M416.hits).toBe(1);
      expect(result.M416.shots).toBe(30);
    });
  });
});
```

### 12.2 Integration Tests

```javascript
// test/services/match-service.test.js
describe('MatchService', () => {
  it('should fetch match details', async () => {
    const matchId = 'test-match-id';
    const service = new MatchService(apiClient);
    
    const match = await service.getMatch(matchId);
    
    expect(match).toHaveProperty('data');
    expect(match.data).toHaveProperty('attributes');
    expect(match.data.type).toBe('match');
  });
});
```

### 12.3 Mock Data for Testing

Store sample API responses in `test/fixtures/`:
- `player-response.json`
- `match-response.json`
- `telemetry-sample.json`

---

## 13. Performance Considerations

### 13.1 Optimization Strategies

1. **Parallel API Calls**
   ```javascript
   // Fetch multiple players simultaneously
   const playerPromises = playerNames.map(name => 
     playerService.getPlayer(name)
   );
   const players = await Promise.all(playerPromises);
   ```

2. **Stream Processing for Telemetry**
   ```javascript
   // Don't load entire telemetry file into memory
   const stream = require('stream');
   const pipeline = util.promisify(stream.pipeline);
   
   await pipeline(
     axios.get(telemetryUrl, { responseType: 'stream' }),
     zlib.createGunzip(),
     new JSONStream.parse('*'),
     new TelemetryProcessor(playerNames)
   );
   ```

3. **Aggressive Caching**
   - Cache player IDs (rarely change)
   - Cache match data (static after 14 days)
   - Cache telemetry (large files, never change)

4. **Lazy Loading**
   - Only fetch telemetry if detailed analysis requested
   - Only fetch weapon mastery if needed

### 13.2 Memory Management

- Process telemetry events in chunks
- Clear cache periodically
- Use streams for large files
- Limit concurrent API calls to 3-5

---

## 14. Security Considerations

### 14.1 API Key Protection

```javascript
// Never log API keys
const sanitizeUrl = (url) => {
  return url.replace(/Bearer [A-Za-z0-9_-]+/, 'Bearer ***');
};

// Validate API key format before use
const validateApiKey = (key) => {
  if (!key || key.length < 20) {
    throw new Error('Invalid API key format');
  }
};
```

### 14.2 Input Validation

```javascript
// Sanitize player names
const sanitizePlayerName = (name) => {
  // Remove special characters that could be injection attempts
  return name.replace(/[^a-zA-Z0-9_-]/g, '');
};

// Validate match ID format
const validateMatchId = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};
```

---

## 15. Deployment & Distribution

### 15.1 Installation

```bash
# Global installation
npm install -g pubg-stats-cli

# Or local installation
npm install pubg-stats-cli
npx pubg-stats analyze --help
```

### 15.2 Setup Instructions

```bash
# 1. Get API key
echo "Visit https://developer.pubg.com to get your API key"

# 2. Configure environment
cp .env.example .env
nano .env  # Add your API key

# 3. (Optional) Set default players
cp .pubgrc.json.example .pubgrc.json
nano .pubgrc.json  # Add your player names

# 4. Test installation
pubg-stats analyze -p "YourPlayerName" -m 1
```

### 15.3 OpenClaw Integration

For use as an OpenClaw skill:

```bash
# Install to OpenClaw environment
cd /path/to/openclaw/skills
git clone <repo> pubg-stats
cd pubg-stats
npm install --production

# Create wrapper script for OpenClaw
cat > skill.sh << 'EOF'
#!/bin/bash
source .env
node bin/pubg-stats.js "$@"
EOF

chmod +x skill.sh
```

---

## 16. Future Enhancements

### 16.1 Phase 2 Features
- **Heatmap Generation:** Visualize movement and kills on map images
- **Squad Comparison:** Compare squad performance vs. other squads in match
- **Historical Trends:** Track performance improvements over time
- **Auto-coaching:** Real-time suggestions based on live stats
- **Discord Integration:** Post match summaries to Discord channels

### 16.2 Phase 3 Features
- **Replay Analysis:** Parse replay files for even more detailed data
- **ML Predictions:** Predict match outcomes based on early-game performance
- **Team Builder:** Suggest optimal squad compositions
- **Tournament Mode:** Special analytics for competitive matches

---

## 17. Appendices

### 17.1 PUBG API Rate Limits

- **Default:** 10 requests per minute
- **Can request increase** via developer portal
- **Telemetry CDN:** No rate limit (separate CDN)

### 17.2 Useful Resources

- Official Docs: https://documentation.pubg.com
- Developer Portal: https://developer.pubg.com
- Data Dictionaries: https://github.com/pubg/api-assets
- Community Discord: https://discord.gg/pubgapi

### 17.3 Weapon ID Reference

Common weapon IDs from API:
```javascript
const WEAPONS = {
  // Assault Rifles
  'Item_Weapon_AKM_C': 'AKM',
  'Item_Weapon_M416_C': 'M416',
  'Item_Weapon_SCAR-L_C': 'SCAR-L',
  'Item_Weapon_AUG_C': 'AUG A3',
  'Item_Weapon_Groza_C': 'Groza',
  
  // DMRs
  'Item_Weapon_SKS_C': 'SKS',
  'Item_Weapon_Mini14_C': 'Mini 14',
  'Item_Weapon_Mk14_C': 'Mk14 EBR',
  
  // Sniper Rifles
  'Item_Weapon_Kar98k_C': 'Kar98k',
  'Item_Weapon_M24_C': 'M24',
  'Item_Weapon_AWM_C': 'AWM',
  
  // SMGs
  'Item_Weapon_UMP_C': 'UMP45',
  'Item_Weapon_Vector_C': 'Vector',
  'Item_Weapon_Uzi_C': 'Micro UZI'
};
```

### 17.4 Map Coordinate Ranges

```javascript
const MAP_SIZES = {
  'Baltic_Main': { x: [0, 816000], y: [0, 816000] },     // Erangel
  'Desert_Main': { x: [0, 816000], y: [0, 816000] },     // Miramar
  'Savage_Main': { x: [0, 408000], y: [0, 408000] },     // Sanhok
  'DihorOtok_Main': { x: [0, 816000], y: [0, 816000] },  // Vikendi
  'Summerland_Main': { x: [0, 816000], y: [0, 816000] }, // Karakin
  'Tiger_Main': { x: [0, 816000], y: [0, 816000] },      // Taego
  'Chimera_Main': { x: [0, 816000], y: [0, 816000] }     // Deston
};
```

---

## 18. Conclusion

This SDD provides a comprehensive blueprint for building a lightweight, OpenClaw-compatible PUBG stats CLI tool. The design emphasizes:

1. **Simplicity:** Minimal dependencies, straightforward architecture
2. **Performance:** Efficient API usage, caching, rate limiting
3. **Actionable Insights:** Focus on improvement areas, not just stats
4. **Flexibility:** Multiple output formats, configurable options
5. **Extensibility:** Clear structure for future enhancements

The tool will enable players to gain deep insights into their gameplay, identify specific areas for improvement, and receive AI-assisted coaching through OpenClaw integration.

**Estimated Development Time:** 2-3 weeks for MVP (analyze command + basic analytics)

**Next Steps:**
1. Set up project structure and dependencies
2. Implement API client and rate limiting
3. Build service layer (Player, Match, Telemetry)
4. Develop analytics engine (Aim, Weapon, Tactical, Combat)
5. Create CLI interface and output formatters
6. Write tests and documentation
7. Package for distribution and OpenClaw integration
