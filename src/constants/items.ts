/**
 * Canonical mapping: PUBG API item IDs (telemetry itemId) → display names.
 * Used for consumables (LogHeal, LogItemUse) and any item display.
 * Source: PUBG api-assets dictionaries/telemetry/item/itemId.json
 */
export const ITEM_NAMES: Record<string, string> = {
  Helmet_Repair_Kit_C: "Helmet Repair Kit",
  InstantRevivalKit_C: "Critical Response Kit",
  Item_Ammo_12GuageSlug_C: "12 Gauge Slug",
  Item_Ammo_12Guage_C: "12 Gauge Ammo",
  Item_Ammo_300Magnum_C: "300 Magnum Ammo",
  Item_Ammo_40mm_C: "40mm Smoke Grenade",
  Item_Ammo_45ACP_C: ".45 ACP Ammo",
  Item_Ammo_556mm_C: "5.56mm Ammo",
  Item_Ammo_57mm_C: "5.7mm Ammo",
  Item_Ammo_762mm_C: "7.62mm Ammo",
  Item_Ammo_9mm_C: "9mm Ammo",
  Item_Ammo_Bolt_C: "Crossbow Bolt",
  Item_Ammo_Flare_C: "Flare Gun Ammo",
  Item_Ammo_Mortar_C: "Mortar Ammo",
  Item_Boost_AdrenalineSyringe_C: "Adrenaline Syringe",
  Item_Boost_EnergyDrink_C: "Energy Drink",
  Item_Boost_PainKiller_C: "Painkiller",
  Item_Heal_Bandage_C: "Bandage",
  Item_Heal_FirstAid_C: "First Aid Kit",
  Item_Heal_MedKit_C: "Med Kit",
  Item_JerryCan_C: "Gas Can",
  Vehicle_Repair_Kit_C: "Vehicle Repair Kit",
  Vest_Repair_Kit_C: "Vest Repair Kit",
  // Attachments (commonly seen in use/pickup)
  Item_Attach_Weapon_Lower_AngledForeGrip_C: "Angled Foregrip",
  Item_Attach_Weapon_Lower_Foregrip_C: "Vertical Foregrip",
  Item_Attach_Weapon_Lower_HalfGrip_C: "Half Grip",
  Item_Attach_Weapon_Lower_LaserPointer_C: "Laser Sight",
  Item_Attach_Weapon_Lower_LightweightForeGrip_C: "Light Grip",
  Item_Attach_Weapon_Lower_ThumbGrip_C: "Thumb Grip",
  Item_Attach_Weapon_Muzzle_Choke_C: "Choke",
  Item_Attach_Weapon_Muzzle_Compensator_Large_C: "Compensator (AR/DMR)",
  Item_Attach_Weapon_Muzzle_Compensator_Medium_C: "Compensator (SMG)",
  Item_Attach_Weapon_Muzzle_Compensator_SniperRifle_C: "Compensator (SR)",
  Item_Attach_Weapon_Muzzle_FlashHider_Large_C: "Flash Hider (AR/DMR)",
  Item_Attach_Weapon_Muzzle_FlashHider_Medium_C: "Flash Hider (SMG)",
  Item_Attach_Weapon_Muzzle_FlashHider_SniperRifle_C: "Flash Hider (SR)",
  Item_Attach_Weapon_Muzzle_Suppressor_Large_C: "Suppressor (AR/DMR)",
  Item_Attach_Weapon_Muzzle_Suppressor_Medium_C: "Suppressor (SMG)",
  Item_Attach_Weapon_Muzzle_Suppressor_Small_C: "Suppressor (Pistol)",
  Item_Attach_Weapon_Muzzle_Suppressor_SniperRifle_C: "Suppressor (SR)",
  Item_Attach_Weapon_Upper_ACOG_01_C: "4x ACOG Scope",
  Item_Attach_Weapon_Upper_Aimpoint_C: "2x Aimpoint",
  Item_Attach_Weapon_Upper_CQBSS_C: "8x CQBSS Scope",
  Item_Attach_Weapon_Upper_DotSight_01_C: "Red Dot Sight",
  Item_Attach_Weapon_Upper_Holosight_C: "Holographic Sight",
  Item_Attach_Weapon_Upper_PM2_01_C: "15x PM II Scope",
  Item_Attach_Weapon_Upper_Scope3x_C: "3x Scope",
  Item_Attach_Weapon_Upper_Scope6x_C: "6x Scope",
  Item_Attach_Weapon_Upper_Thermal_C: "Thermal Scope",
  Item_Attach_Weapon_Magazine_Extended_Large_C: "Extended Mag (AR/DMR)",
  Item_Attach_Weapon_Magazine_Extended_Medium_C: "Extended Mag (SMG)",
  Item_Attach_Weapon_Magazine_Extended_Small_C: "Extended Mag (Pistol)",
  Item_Attach_Weapon_Magazine_Extended_SniperRifle_C: "Extended Mag (SR)",
  Item_Attach_Weapon_Magazine_QuickDraw_Large_C: "QuickDraw Mag (AR/DMR)",
  Item_Attach_Weapon_Magazine_QuickDraw_Medium_C: "QuickDraw Mag (SMG)",
  Item_Attach_Weapon_Magazine_QuickDraw_Small_C: "QuickDraw Mag (Pistol)",
  Item_Attach_Weapon_Magazine_QuickDraw_SniperRifle_C: "QuickDraw Mag (SR)",
  Item_Attach_Weapon_Stock_AR_Composite_C: "Tactical Stock",
  Item_Attach_Weapon_Stock_AR_HeavyStock_C: "Heavy Stock",
  Item_Attach_Weapon_Stock_SniperRifle_CheekPad_C: "Sniper Cheek Pad",
  Item_Attach_Weapon_SideRail_DotSight_RMR_C: "Canted Sight",
};

/**
 * Resolve a PUBG telemetry itemId to a human-readable display name.
 * Falls back to a shortened form of the id or "Unknown" for empty/missing.
 */
export function resolveItemName(itemId: string | null | undefined): string {
  if (itemId == null || itemId.trim() === "") {
    return "Unknown";
  }
  const known = ITEM_NAMES[itemId];
  if (known) return known;
  // Fallback: strip common prefixes and _C for slightly nicer raw id
  const fallback = itemId
    .replace(/^Item_/, "")
    .replace(/_C$/, "")
    .replace(/_/g, " ");
  return fallback || itemId;
}
