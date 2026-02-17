// PUBG API Response Types

export interface PubgApiResponse<T> {
  data: T;
  included?: PubgIncluded[];
  links?: Record<string, string>;
  meta?: Record<string, unknown>;
}

export interface PubgIncluded {
  type: string;
  id: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, unknown>;
}

export interface PlayerData {
  type: 'player';
  id: string;
  attributes: {
    name: string;
    shardId: string;
    stats: null;
    titleId: string;
    patchVersion: string;
    banType: string;
    clanId: string;
  };
  relationships: {
    matches: {
      data: Array<{ type: 'match'; id: string }>;
    };
  };
}

export interface MatchData {
  type: 'match';
  id: string;
  attributes: {
    createdAt: string;
    duration: number;
    gameMode: string;
    mapName: string;
    patchVersion: string;
    shardId: string;
    stats: null;
    tags: null;
    titleId: string;
    seasonState: string;
    isCustomMatch: boolean;
  };
  relationships: {
    assets: { data: Array<{ type: string; id: string }> };
    rosters: { data: Array<{ type: string; id: string }> };
  };
}

export interface AssetData {
  type: 'asset';
  id: string;
  attributes: {
    URL: string;
    createdAt: string;
    description: string;
    name: string;
  };
}

export interface RosterData {
  type: 'roster';
  id: string;
  attributes: {
    shardId: string;
    stats: {
      rank: number;
      teamId: number;
      won: string;
    };
    won: string;
    teamId: number;
  };
  relationships: {
    participants: { data: Array<{ type: string; id: string }> };
    team: { data: null };
  };
}

export interface ParticipantData {
  type: 'participant';
  id: string;
  attributes: {
    actor: string;
    shardId: string;
    stats: ParticipantStats;
  };
}

export interface ParticipantStats {
  DBNOs: number;
  assists: number;
  boosts: number;
  damageDealt: number;
  deathType: string;
  headshotKills: number;
  heals: number;
  killPlace: number;
  killStreaks: number;
  kills: number;
  longestKill: number;
  name: string;
  playerId: string;
  revives: number;
  rideDistance: number;
  roadKills: number;
  swimDistance: number;
  teamKills: number;
  timeSurvived: number;
  vehicleDestroys: number;
  walkDistance: number;
  weaponsAcquired: number;
  winPlace: number;
}

export interface SeasonData {
  type: 'season';
  id: string;
  attributes: {
    isCurrentSeason: boolean;
    isOffseason: boolean;
  };
}

// Telemetry Event Types

export interface TelemetryEvent {
  _D: string;
  _T: string;
}

export interface LogPlayerAttack extends TelemetryEvent {
  _T: 'LogPlayerAttack';
  attackId: number;
  fireWeaponStackCount: number;
  attackType: string;
  attacker: TelemetryCharacter;
  weapon: TelemetryItem;
  vehicle: unknown;
}

export interface LogWeaponFireCount extends TelemetryEvent {
  _T: 'LogWeaponFireCount';
  character: TelemetryCharacter;
  weaponId: string;
  fireCount: number;
}

export interface LogPlayerKillV2 extends TelemetryEvent {
  _T: 'LogPlayerKillV2';
  attackId: number;
  dBNOId: number;
  victimGameResult: {
    rank: number;
    gameResult: string;
    teamId: number;
  };
  victim: TelemetryCharacter;
  victimWeapon: string;
  victimWeaponAdditionalInfo: string[];
  dBNOMaker: TelemetryCharacter | null;
  dBNODamageInfo: unknown;
  finisher: TelemetryCharacter | null;
  finishDamageInfo: unknown;
  killer: TelemetryCharacter;
  killerDamageInfo: {
    causerName: string;
    damage: number;
    damageReason: string;
    damageTypeCategory: string;
    additionalInfo: string[];
    distance: number;
    isThroughPenetrableWall: boolean;
  };
  assists_AccountId: string[];
  teamKillers_AccountId: string[];
  isSuicide: boolean;
}

export interface LogPlayerTakeDamage extends TelemetryEvent {
  _T: 'LogPlayerTakeDamage';
  attackId: number;
  attacker: TelemetryCharacter | null;
  victim: TelemetryCharacter;
  damageTypeCategory: string;
  damageReason: string;
  damage: number;
  damageCauserName: string;
  additionalInfo: string[];
  isThroughPenetrableWall: boolean;
}

export interface LogPlayerPosition extends TelemetryEvent {
  _T: 'LogPlayerPosition';
  character: TelemetryCharacter;
  vehicle: unknown;
  elapsedTime: number;
  numAlivePlayers: number;
  isGame: number;
}

export interface LogItemPickup extends TelemetryEvent {
  _T: 'LogItemPickup';
  character: TelemetryCharacter;
  item: TelemetryItem;
}

export interface LogItemEquip extends TelemetryEvent {
  _T: 'LogItemEquip';
  character: TelemetryCharacter;
  item: TelemetryItem;
}

export interface LogGameStatePeriodic extends TelemetryEvent {
  _T: 'LogGameStatePeriodic';
  gameState: {
    elapsedTime: number;
    numAliveTeams: number;
    numJoinPlayers: number;
    numStartPlayers: number;
    numAlivePlayers: number;
    safetyZonePosition: Location3D;
    safetyZoneRadius: number;
    poisonGasWarningPosition: Location3D;
    poisonGasWarningRadius: number;
    redZonePosition: Location3D;
    redZoneRadius: number;
  };
}

export interface TelemetryCharacter {
  name: string;
  teamId: number;
  health: number;
  location: Location3D;
  ranking: number;
  accountId: string;
  isInBlueZone?: boolean;
  isInRedZone?: boolean;
  zone?: string[];
}

export interface TelemetryItem {
  itemId: string;
  stackCount: number;
  category: string;
  subCategory: string;
  attachedItems: string[];
}

export interface Location3D {
  x: number;
  y: number;
  z: number;
}

// Analytics Types

export interface WeaponAccuracy {
  accuracy: number;
  hits: number;
  shots: number;
  kills?: number;
  headshotKills?: number;
}

export interface AimAnalysis {
  overallAccuracy: number;
  weaponBreakdown: Record<string, WeaponAccuracy>;
  headshotRate: number;
  bestWeapon: string;
  bestWeaponAccuracy: number;
}

export interface WeaponEffectiveness {
  weapon: string;
  kills: number;
  damage: number;
  avgDistance: number;
  accuracy: number;
  effectivenessScore: number;
  recommendation: string;
}

export interface WeaponAnalysis {
  mostEffective: string;
  effectiveness: Record<string, WeaponEffectiveness>;
  rankings: WeaponEffectiveness[];
}

export interface ZonePositioning {
  insideZonePercent: number;
  edgePlayPercent: number;
  centerPlayPercent: number;
  avgDistanceToCenter: number;
  lateRotations: number;
}

export interface TacticalAnalysis {
  zonePositioning: ZonePositioning;
  movementStyle: 'aggressive' | 'passive' | 'moderate';
  hotDropFrequency: number;
  avgSurvivalTime: number;
}

export interface CombatEffectivenessScore {
  score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  kda: number;
  damageRatio: number;
}

export interface EngagementRanges {
  close: number;
  medium: number;
  long: number;
  extreme: number;
}

export interface CombatAnalysis {
  damageDealt: number;
  damageTaken: number;
  damageRatio: number;
  engagementRanges: EngagementRanges;
  engagementWinRate: number;
  combatScore: CombatEffectivenessScore;
}

export interface PlayerMatchStats {
  name: string;
  kills: number;
  deaths: number;
  assists: number;
  damageDealt: number;
  damageTaken: number;
  survivalTime: number;
  winPlace: number;
  headshotKills: number;
  DBNOs: number;
  revives: number;
  boosts: number;
  heals: number;
  walkDistance: number;
  rideDistance: number;
}

export interface PlayerAnalysis {
  name: string;
  matchesAnalyzed: number;
  avgStats: PlayerMatchStats;
  aim: AimAnalysis;
  weapons: WeaponAnalysis;
  tactics: TacticalAnalysis;
  combat: CombatAnalysis;
}

export interface Insight {
  category: 'aim' | 'weapons' | 'tactics' | 'combat';
  severity: 'high' | 'medium' | 'low';
  player: string;
  message: string;
  recommendation: string;
}

export interface SquadAnalysis {
  players: PlayerAnalysis[];
  matchesAnalyzed: number;
  dateRange: { start: string; end: string };
  insights: Insight[];
  mapName?: string;
  squadStats: {
    avgPlacement: number;
    totalKills: number;
    avgDamage: number;
    avgSurvivalTime: number;
  };
}

// Config Types

export interface PubgConfig {
  platform: string;
  defaultPlayers: string[];
  matchLimit: number;
  caching: {
    enabled: boolean;
    ttl: number;
  };
  analytics: {
    minAccuracyThreshold: number;
    engagementRanges: {
      close: [number, number];
      medium: [number, number];
      long: [number, number];
      extreme: [number, number];
    };
  };
}

// Processed match data used across analytics
export interface ProcessedMatchData {
  matchId: string;
  mapName: string;
  gameMode: string;
  createdAt: string;
  duration: number;
  participants: ParticipantStats[];
  telemetry: TelemetryEvent[] | null;
  playerStats: Record<string, ParticipantStats>;
}
