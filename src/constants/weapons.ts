export const WEAPON_NAMES: Record<string, string> = {
  // Assault Rifles
  'Item_Weapon_AKM_C': 'AKM',
  'Item_Weapon_M416_C': 'M416',
  'Item_Weapon_SCAR-L_C': 'SCAR-L',
  'Item_Weapon_AUG_C': 'AUG A3',
  'Item_Weapon_Groza_C': 'Groza',
  'Item_Weapon_G36C_C': 'G36C',
  'Item_Weapon_Mk47Mutant_C': 'Mk47 Mutant',
  'Item_Weapon_BerylM762_C': 'Beryl M762',
  'Item_Weapon_ACE32_C': 'ACE32',

  // DMRs
  'Item_Weapon_SKS_C': 'SKS',
  'Item_Weapon_Mini14_C': 'Mini 14',
  'Item_Weapon_Mk14_C': 'Mk14 EBR',
  'Item_Weapon_SLR_C': 'SLR',
  'Item_Weapon_QBU88_C': 'QBU',
  'Item_Weapon_VSS_C': 'VSS',

  // Sniper Rifles
  'Item_Weapon_Kar98k_C': 'Kar98k',
  'Item_Weapon_M24_C': 'M24',
  'Item_Weapon_AWM_C': 'AWM',
  'Item_Weapon_Lynx_C': 'Lynx AMR',
  'Item_Weapon_Mosin_C': 'Mosin Nagant',

  // SMGs
  'Item_Weapon_UMP_C': 'UMP45',
  'Item_Weapon_Vector_C': 'Vector',
  'Item_Weapon_Uzi_C': 'Micro UZI',
  'Item_Weapon_Tommy_C': 'Tommy Gun',
  'Item_Weapon_PP19Bizon_C': 'PP-19 Bizon',
  'Item_Weapon_MP5K_C': 'MP5K',

  // Shotguns
  'Item_Weapon_S686_C': 'S686',
  'Item_Weapon_S1897_C': 'S1897',
  'Item_Weapon_S12K_C': 'S12K',
  'Item_Weapon_DBS_C': 'DBS',
  'Item_Weapon_Saiga12_C': 'O12',

  // LMGs
  'Item_Weapon_DP28_C': 'DP-28',
  'Item_Weapon_M249_C': 'M249',
  'Item_Weapon_MG3_C': 'MG3',

  // Pistols
  'Item_Weapon_G18C_C': 'P18C',
  'Item_Weapon_M9_C': 'P92',
  'Item_Weapon_R45_C': 'R45',
  'Item_Weapon_R1895_C': 'R1895',
  'Item_Weapon_Deagle_C': 'Deagle',
  'Item_Weapon_Skorpion_C': 'Skorpion',

  // Melee / Throwables
  'Item_Weapon_Pan_C': 'Pan',
  'Item_Weapon_Machete_C': 'Machete',
  'Item_Weapon_Crossbow_C': 'Crossbow',
};

export function getWeaponName(itemId: string): string {
  return WEAPON_NAMES[itemId] || itemId.replace('Item_Weapon_', '').replace('_C', '');
}

export const WEAPON_CATEGORIES = {
  AR: ['AKM', 'M416', 'SCAR-L', 'AUG A3', 'Groza', 'G36C', 'Mk47 Mutant', 'Beryl M762', 'ACE32'],
  DMR: ['SKS', 'Mini 14', 'Mk14 EBR', 'SLR', 'QBU', 'VSS'],
  SR: ['Kar98k', 'M24', 'AWM', 'Lynx AMR', 'Mosin Nagant'],
  SMG: ['UMP45', 'Vector', 'Micro UZI', 'Tommy Gun', 'PP-19 Bizon', 'MP5K'],
  SG: ['S686', 'S1897', 'S12K', 'DBS', 'O12'],
  LMG: ['DP-28', 'M249', 'MG3'],
};
