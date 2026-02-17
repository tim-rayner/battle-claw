// Canonical mapping: PUBG API item IDs → display names
export const WEAPON_NAMES: Record<string, string> = {
  // Assault Rifles
  Item_Weapon_AKM_C: "AKM",
  Item_Weapon_M416_C: "M416",
  Item_Weapon_HK416_C: "M416",
  "Item_Weapon_SCAR-L_C": "SCAR-L",
  Item_Weapon_AUG_C: "AUG A3",
  Item_Weapon_Groza_C: "Groza",
  Item_Weapon_G36C_C: "G36C",
  Item_Weapon_Mk47Mutant_C: "Mk47 Mutant",
  Item_Weapon_BerylM762_C: "Beryl M762",
  Item_Weapon_ACE32_C: "ACE32",
  Item_Weapon_FAMAS_C: "FAMAS",
  Item_Weapon_K2_C: "K2",
  Item_Weapon_M16A4_C: "M16A4",
  Item_Weapon_QBZ95_C: "QBZ95",

  // DMRs
  Item_Weapon_SKS_C: "SKS",
  Item_Weapon_Mini14_C: "Mini 14",
  Item_Weapon_Mk14_C: "Mk14 EBR",
  Item_Weapon_SLR_C: "SLR",
  Item_Weapon_QBU88_C: "QBU",
  Item_Weapon_VSS_C: "VSS",
  Item_Weapon_Dragunov_C: "Dragunov",
  Item_Weapon_Mk12_C: "Mk12",

  // Sniper Rifles
  Item_Weapon_Kar98k_C: "Kar98k",
  Item_Weapon_M24_C: "M24",
  Item_Weapon_AWM_C: "AWM",
  Item_Weapon_Lynx_C: "Lynx AMR",
  Item_Weapon_L6_C: "Lynx AMR",
  Item_Weapon_Mosin_C: "Mosin Nagant",
  Item_Weapon_Win94_C: "Win94",

  // SMGs
  Item_Weapon_UMP_C: "UMP45",
  Item_Weapon_Vector_C: "Vector",
  Item_Weapon_Uzi_C: "Micro UZI",
  Item_Weapon_UZI_C: "Micro UZI",
  Item_Weapon_Tommy_C: "Tommy Gun",
  Item_Weapon_Thompson_C: "Tommy Gun",
  Item_Weapon_PP19Bizon_C: "PP-19 Bizon",
  Item_Weapon_BizonPP19_C: "PP-19 Bizon",
  Item_Weapon_MP5K_C: "MP5K",
  Item_Weapon_P90_C: "P90",
  Item_Weapon_JS9_C: "JS9",
  Item_Weapon_MP9_C: "MP9",

  // Shotguns
  Item_Weapon_S686_C: "S686",
  Item_Weapon_S1897_C: "S1897",
  Item_Weapon_S12K_C: "S12K",
  Item_Weapon_DBS_C: "DBS",
  Item_Weapon_Saiga12_C: "O12",

  // LMGs
  Item_Weapon_DP28_C: "DP-28",
  Item_Weapon_DP12_C: "DBS",
  Item_Weapon_M249_C: "M249",
  Item_Weapon_MG3_C: "MG3",

  // Pistols
  Item_Weapon_G18C_C: "P18C",
  Item_Weapon_M9_C: "P92",
  Item_Weapon_M1911_C: "P1911",
  Item_Weapon_R45_C: "R45",
  Item_Weapon_R1895_C: "R1895",
  Item_Weapon_NagantM1895_C: "R1895",
  Item_Weapon_Deagle_C: "Deagle",
  Item_Weapon_DesertEagle_C: "Deagle",
  Item_Weapon_Skorpion_C: "Skorpion",
  Item_Weapon_vz61Skorpion_C: "Skorpion",
  Item_Weapon_Sawed_Off_C: "Sawed-Off",
  Item_Weapon_SawedOff_C: "Sawed-Off",
  Item_Weapon_Flaregun_C: "Flare Gun",

  // Melee
  Item_Weapon_Pan_C: "Pan",
  Item_Weapon_Machete_C: "Machete",
  Item_Weapon_Crossbow_C: "Crossbow",
  Item_Weapon_Sickle_C: "Sickle",
  Item_Weapon_Cowbar_C: "Crowbar",
  Item_Weapon_Crowbar_C: "Crowbar",

  // Throwables
  Item_Weapon_Grenade_C: "Frag Grenade",
  Item_Weapon_FlashBang_C: "Stun Grenade",
  Item_Weapon_SmokeBomb_C: "Smoke Grenade",
  Item_Weapon_Molotov_C: "Molotov Cocktail",
  Item_Weapon_C4_C: "C4",
  Item_Weapon_StickyGrenade_C: "Sticky Bomb",
  Item_Weapon_SpikeTrap_C: "Spike Trap",
  Item_Weapon_Decoy_C: "Decoy Grenade",
  Item_Weapon_BluezoneGrenade_C: "Blue Zone Grenade",

  // Launchers / Special
  Item_Weapon_M79_C: "M79",
  Item_Weapon_Panzerfaust_C: "Panzerfaust",
  Item_Weapon_Mortar_C: "Mortar",
};

// Telemetry damageCauserName variants (Weap prefix, alternate naming, etc.)
// Maps non-standard telemetry weapon identifiers → canonical display names
const WEAPON_ALIASES: Record<string, string> = {
  // --- Weap*_C format (damageCauserName in LogPlayerTakeDamage / LogPlayerKillV2) ---
  // Assault Rifles
  WeapAKM_C: "AKM",
  WeapM416_C: "M416",
  WeapHK416_C: "M416",
  "WeapSCAR-L_C": "SCAR-L",
  WeapScarL_C: "SCAR-L",
  WeapAUG_C: "AUG A3",
  WeapGroza_C: "Groza",
  WeapG36C_C: "G36C",
  WeapMk47Mutant_C: "Mk47 Mutant",
  WeapBerylM762_C: "Beryl M762",
  WeapACE32_C: "ACE32",
  WeapFAMAS_C: "FAMAS",
  WeapK2_C: "K2",

  // DMRs
  WeapSKS_C: "SKS",
  WeapMini14_C: "Mini 14",
  WeapMk14_C: "Mk14 EBR",
  WeapSLR_C: "SLR",
  WeapQBU88_C: "QBU",
  WeapQBU_C: "QBU",
  WeapVSS_C: "VSS",
  WeapDragunov_C: "Dragunov",

  // Sniper Rifles
  WeapKar98k_C: "Kar98k",
  WeapM24_C: "M24",
  WeapAWM_C: "AWM",
  WeapLynx_C: "Lynx AMR",
  WeapL6_C: "Lynx AMR",
  WeapMosin_C: "Mosin Nagant",
  WeapMosinNagant_C: "Mosin Nagant",
  WeapWin94_C: "Win94",
  WeapWinchester_C: "S1897",

  // SMGs
  WeapUMP_C: "UMP45",
  WeapUMP45_C: "UMP45",
  WeapVector_C: "Vector",
  WeapUZI_C: "Micro UZI",
  WeapMicroUZI_C: "Micro UZI",
  WeapThompson_C: "Tommy Gun",
  WeapTommy_C: "Tommy Gun",
  WeapTommyGun_C: "Tommy Gun",
  WeapPP19Bizon_C: "PP-19 Bizon",
  WeapBizonPP19_C: "PP-19 Bizon",
  WeapMP5K_C: "MP5K",
  WeapP90_C: "P90",
  WeapJS9_C: "JS9",
  WeapMP9_C: "MP9",

  // Shotguns
  WeapS686_C: "S686",
  WeapS1897_C: "S1897",
  WeapS12K_C: "S12K",
  WeapDBS_C: "DBS",
  WeapSaiga12_C: "O12",
  WeapO12_C: "O12",

  // LMGs
  WeapDP28_C: "DP-28",
  WeapDP12_C: "DBS",
  WeapM249_C: "M249",
  WeapMG3_C: "MG3",

  // Pistols
  WeapG18C_C: "P18C",
  WeapP18C_C: "P18C",
  WeapM9_C: "P92",
  WeapP92_C: "P92",
  WeapM1911_C: "P1911",
  WeapR45_C: "R45",
  WeapR1895_C: "R1895",
  WeapNagantM1895_C: "R1895",
  WeapDeagle_C: "Deagle",
  WeapDesertEagle_C: "Deagle",
  WeapSkorpion_C: "Skorpion",
  Weapvz61Skorpion_C: "Skorpion",
  WeapSawedOff_C: "Sawed-Off",
  WeapSawed_Off_C: "Sawed-Off",
  WeapFlareGun_C: "Flare Gun",
  WeapFlaregun_C: "Flare Gun",

  // Melee
  WeapPan_C: "Pan",
  WeapMachete_C: "Machete",
  WeapCrossbow_C: "Crossbow",
  WeapSickle_C: "Sickle",
  WeapCrowbar_C: "Crowbar",
  WeapCowbar_C: "Crowbar",

  // Throwables
  WeapGrenade_C: "Frag Grenade",
  WeapFlashBang_C: "Stun Grenade",
  WeapSmokeBomb_C: "Smoke Grenade",
  WeapMolotov_C: "Molotov Cocktail",
  WeapC4_C: "C4",
  WeapStickyGrenade_C: "Sticky Bomb",
  WeapSpikeTrap_C: "Spike Trap",
  WeapDecoy_C: "Decoy Grenade",
  WeapBluezoneGrenade_C: "Blue Zone Grenade",

  // Launchers / Special
  WeapM79_C: "M79",
  WeapPanzerfaust_C: "Panzerfaust",
  WeapMortar_C: "Mortar",

  // --- Weapon variant IDs (alternative internal names) ---
  WeapAK47_C: "AKM",
  WeapBerreta686_C: "S686",
  WeapCrossbow_1_C: "Crossbow",
  WeapDuncansHK416_C: "M416",
  WeapFNFal_C: "SLR",
  WeapG18_C: "P18C",
  WeapJuliesKar98k_C: "Kar98k",
  WeapLunchmeatsAK47_C: "AKM",
  WeapMadsQBU88_C: "QBU",
  WeapMk12_C: "Mk12",
  WeapOriginS12_C: "O12",
  WeapPanzerFaust100M1_C: "Panzerfaust",
  WeapQBZ95_C: "QBZ95",
  WeapRhino_C: "R45",
  WeapSawnoff_C: "Sawed-Off",
  WeapTurret_KillTruck_Main_C: "Kill Truck Turret",

  // --- Projectile IDs (throwables / launchers) ---
  ProjC4_C: "C4",
  ProjGrenade_C: "Frag Grenade",
  ProjIncendiary_C: "Molotov Cocktail",
  ProjMolotov_C: "Molotov Cocktail",
  ProjMolotov_DamageField_Direct_C: "Molotov Cocktail",
  ProjStickyGrenade_C: "Sticky Bomb",
  PanzerFaust100M_Projectile_C: "Panzerfaust",
  Mortar_Projectile_C: "Mortar",
  WeapCowbarProjectile_C: "Crowbar",
  WeapMacheteProjectile_C: "Machete",
  WeapPanProjectile_C: "Pan",
  WeapSickleProjectile_C: "Sickle",
  Bluezonebomb_EffectActor_C: "Blue Zone Grenade",

  // --- Vehicles (road kills) ---
  Buggy_A_01_C: "Buggy",
  Buggy_A_02_C: "Buggy",
  Buggy_A_03_C: "Buggy",
  Dacia_A_01_v2_C: "Dacia",
  Dacia_A_02_v2_C: "Dacia",
  Dacia_A_03_v2_C: "Dacia",
  Uaz_A_01_C: "UAZ",
  Uaz_B_01_C: "UAZ",
  Uaz_C_01_C: "UAZ",
  BP_Motorbike_04_C: "Motorcycle",
  BP_Motorbike_04_SideCar_C: "Motorcycle",
  BP_Mirado_A_02_C: "Mirado",
  BP_Mirado_A_03_C: "Mirado",
  BP_PickupTruck_A_01_C: "Pickup Truck",
  BP_PickupTruck_B_01_C: "Pickup Truck",
  Boat_PG117_C: "PG-117",
  PG117_A_01_C: "PG-117",
  BP_Niva_01_C: "Zima",
  BP_Niva_02_C: "Zima",
  BP_TukTukTuk_A_01_C: "Tukshai",
  BP_Snowmobile_01_C: "Snowmobile",
  BP_Snowbike_01_C: "Snowbike",
  AquaRail_A_01_C: "Aquarail",
  BP_Motorglider_C: "Motor Glider",
  BP_BRDM_C: "BRDM-2",
  BP_Helicopter_C: "Pillar Scout Helicopter",
  BP_Dirtbike_C: "Dirt Bike",
  BP_Scooter_01_A_C: "Scooter",
  BP_Van_A_01_C: "Van",
  BP_M_Rony_A_01_C: "Rony",
  BP_Porter_C: "Porter",
  BP_PonyCoupe_C: "Pony Coupe",
  BP_Blanc_C: "Coupe SUV",
  BP_CoupeRB_C: "Coupe RB",
  BP_ATV_C: "Quad",
  BP_Bicycle_C: "Mountain Bike",
  AirBoat_V2_C: "Airboat",

  // --- Environmental / misc damage causers ---
  Buff_DecreaseBreathInApnea_C: "Drowning",
  Lava: "Lava",
  TslPainCausingVolume: "Lava",
  BP_Spiketrap_C: "Spike Trap",
  Carepackage_Container_C: "Care Package",
  DroppedItemGroup: "Object Fragments",
  BP_FireEffectController_C: "Molotov Fire",
  BP_IncendiaryDebuff_C: "Burn",
  BP_MolotovFireDebuff_C: "Molotov Fire",
  SandStormBuff_BP_C: "Sandstorm",
  AIPawn_Base_Female_C: "AI Player",
  AIPawn_Base_Male_C: "AI Player",

  // --- Blue Zone controllers ---
  BattleRoyaleModeController_Chimera_C: "Blue Zone",
  BattleRoyaleModeController_Def_C: "Blue Zone",
  BattleRoyaleModeController_Desert_C: "Blue Zone",
  BattleRoyaleModeController_DihorOtok_C: "Blue Zone",
  BattleRoyaleModeController_Heaven_C: "Blue Zone",
  BattleRoyaleModeController_Kiki_C: "Blue Zone",
  BattleRoyaleModeController_Savage_C: "Blue Zone",
  BattleRoyaleModeController_Summerland_C: "Blue Zone",
  BattleRoyaleModeController_Tiger_C: "Blue Zone",

  // --- Non-weapon damage causers (zones, punch, etc.) ---
  PlayerFemale_A_C: "Punch",
  PlayerMale_A_C: "Punch",
  Bluezone: "Blue Zone",
  BluezoneGrenade: "Blue Zone Grenade",
  RedZone: "Red Zone",
  RedZoneBomb_C: "Red Zone",

  // --- Common user-entered aliases / shorthand ---
  beryl: "Beryl M762",
  ump: "UMP45",
  aug: "AUG A3",
  mini: "Mini 14",
  mutant: "Mk47 Mutant",
  mk47: "Mk47 Mutant",
  mk14: "Mk14 EBR",
  lynx: "Lynx AMR",
  mosin: "Mosin Nagant",
  uzi: "Micro UZI",
  tommy: "Tommy Gun",
  thompson: "Tommy Gun",
  bizon: "PP-19 Bizon",
  pp19: "PP-19 Bizon",
  deagle: "Deagle",
  "desert eagle": "Deagle",
  dp28: "DP-28",
  "dp-28": "DP-28",
  kar: "Kar98k",
  kar98: "Kar98k",
  vss: "VSS",
  pan: "Pan",
  crossbow: "Crossbow",
  molotov: "Molotov Cocktail",
  frag: "Frag Grenade",
  flash: "Stun Grenade",
  stun: "Stun Grenade",
  smoke: "Smoke Grenade",
  win94: "Win94",
  winchester: "Win94",
  "sawed off": "Sawed-Off",
  "sawed-off": "Sawed-Off",
  "flare gun": "Flare Gun",
  flare: "Flare Gun",
  p18c: "P18C",
  p92: "P92",
  r45: "R45",
  r1895: "R1895",
  nagant: "R1895",
  skorpion: "Skorpion",
  scar: "SCAR-L",
  "scar-l": "SCAR-L",
  scarl: "SCAR-L",
  groza: "Groza",
  g36c: "G36C",
  akm: "AKM",
  ak: "AKM",
  m416: "M416",
  sks: "SKS",
  slr: "SLR",
  qbu: "QBU",
  awm: "AWM",
  m24: "M24",
  vector: "Vector",
  mp5k: "MP5K",
  mp5: "MP5K",
  p90: "P90",
  s686: "S686",
  s1897: "S1897",
  s12k: "S12K",
  dbs: "DBS",
  o12: "O12",
  m249: "M249",
  mg3: "MG3",
  ace32: "ACE32",
  ace: "ACE32",
  famas: "FAMAS",
  k2: "K2",
  js9: "JS9",
  mp9: "MP9",
  p1911: "P1911",
  m79: "M79",
  panzerfaust: "Panzerfaust",
  mortar: "Mortar",
  c4: "C4",
  "sticky bomb": "Sticky Bomb",
  sticky: "Sticky Bomb",
  "spike trap": "Spike Trap",
  dragunov: "Dragunov",
};

// Build a case-insensitive lookup combining all sources
// This is computed once at module load for fast lookups
const _lookupMap = new Map<string, string>();

// Index WEAPON_NAMES (Item_Weapon_*_C → display name)
for (const [id, name] of Object.entries(WEAPON_NAMES)) {
  _lookupMap.set(id.toLowerCase(), name);
}

// Index WEAPON_ALIASES (Weap*_C, shorthand, etc. → display name)
for (const [alias, name] of Object.entries(WEAPON_ALIASES)) {
  _lookupMap.set(alias.toLowerCase(), name);
}

// Index display names → themselves (so "AKM" resolves to "AKM")
const _allDisplayNames = new Set(Object.values(WEAPON_NAMES));
for (const name of _allDisplayNames) {
  _lookupMap.set(name.toLowerCase(), name);
}

/** Display name for fist/punch (default weapon). Only recorded when damage > 0. */
export const PUNCH_WEAPON_NAME = "Punch";

/**
 * Resolves any weapon identifier to its canonical display name.
 * Handles: PUBG API item IDs, telemetry damageCauserName variants,
 * display names, common user-entered aliases, null/undefined values.
 *
 * Falls back to stripping known prefixes/suffixes if no mapping is found.
 */
export function resolveWeaponName(input: string | null | undefined): string {
  if (!input) return "Unknown";

  // 1. Direct lookup (case-insensitive)
  const direct = _lookupMap.get(input.toLowerCase());
  if (direct) return direct;

  // 2. Try stripping common prefixes/suffixes and re-lookup
  //    Covers: Item_Weapon_X_C, WeapX_C, BP_X_C, Default__X_C, and trailing _Default_C
  const cleaned = input
    .replace(/^(Item_Weapon_|Weap|BP_Weapon_|BP_|Default__)/, "")
    .replace(/(_Default)?_C$/, "");
  const fromCleaned = _lookupMap.get(cleaned.toLowerCase());
  if (fromCleaned) return fromCleaned;

  // 3. Try extracting just the weapon core name (handles paths like Weapon_AKM or nested names)
  const coreMatch = cleaned.match(/(?:Weapon_)?([A-Za-z0-9]+[-]?[A-Za-z0-9]*)/);
  if (coreMatch) {
    const core = _lookupMap.get(coreMatch[1].toLowerCase());
    if (core) return core;
  }

  // 4. Fallback: return cleaned-up version (never return raw API gibberish)
  const fallback = cleaned.replace(/_/g, " ").trim();
  return fallback || input;
}

/**
 * @deprecated Use resolveWeaponName() instead. Kept for backward compatibility.
 */
export function getWeaponName(itemId: string | null | undefined): string {
  return resolveWeaponName(itemId);
}

export const WEAPON_CATEGORIES = {
  AR: [
    "AKM",
    "M416",
    "SCAR-L",
    "AUG A3",
    "Groza",
    "G36C",
    "Mk47 Mutant",
    "Beryl M762",
    "ACE32",
    "FAMAS",
    "K2",
    "M16A4",
    "QBZ95",
  ],
  DMR: ["SKS", "Mini 14", "Mk14 EBR", "SLR", "QBU", "VSS", "Dragunov", "Mk12"],
  SR: ["Kar98k", "M24", "AWM", "Lynx AMR", "Mosin Nagant", "Win94"],
  SMG: [
    "UMP45",
    "Vector",
    "Micro UZI",
    "Tommy Gun",
    "PP-19 Bizon",
    "MP5K",
    "P90",
    "JS9",
    "MP9",
  ],
  SG: ["S686", "S1897", "S12K", "DBS", "O12"],
  LMG: ["DP-28", "M249", "MG3"],
  Pistol: [
    "P18C",
    "P92",
    "P1911",
    "R45",
    "R1895",
    "Deagle",
    "Skorpion",
    "Sawed-Off",
    "Flare Gun",
  ],
  Melee: ["Pan", "Machete", "Crossbow", "Sickle", "Crowbar"],
  Throwable: [
    "Frag Grenade",
    "Stun Grenade",
    "Smoke Grenade",
    "Molotov Cocktail",
    "C4",
    "Sticky Bomb",
  ],
};
