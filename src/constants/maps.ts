export const MAP_NAMES: Record<string, string> = {
  'Baltic_Main': 'Erangel',
  'Desert_Main': 'Miramar',
  'Savage_Main': 'Sanhok',
  'DihorOtok_Main': 'Vikendi',
  'Summerland_Main': 'Karakin',
  'Tiger_Main': 'Taego',
  'Chimera_Main': 'Deston',
  'Neon_Main': 'Rondo',
  'Kiki_Main': 'Deston',
};

export const MAP_SIZES: Record<string, { x: [number, number]; y: [number, number] }> = {
  'Baltic_Main': { x: [0, 816000], y: [0, 816000] },
  'Desert_Main': { x: [0, 816000], y: [0, 816000] },
  'Savage_Main': { x: [0, 408000], y: [0, 408000] },
  'DihorOtok_Main': { x: [0, 816000], y: [0, 816000] },
  'Summerland_Main': { x: [0, 204000], y: [0, 204000] },
  'Tiger_Main': { x: [0, 816000], y: [0, 816000] },
  'Chimera_Main': { x: [0, 816000], y: [0, 816000] },
  'Neon_Main': { x: [0, 816000], y: [0, 816000] },
};

export function getMapName(mapId: string): string {
  return MAP_NAMES[mapId] || mapId;
}
