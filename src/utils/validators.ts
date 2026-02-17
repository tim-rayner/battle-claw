import { VALID_PLATFORMS, Platform } from '../constants/platforms';

export function sanitizePlayerName(name: string): string {
  // Allow alphanumeric, underscores, hyphens, dots - common in PUBG names
  return name.replace(/[^a-zA-Z0-9_\-\.]/g, '').slice(0, 64);
}

export function validateMatchId(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function validatePlatform(platform: string): platform is Platform {
  return VALID_PLATFORMS.includes(platform as Platform);
}

export function validateApiKey(key: string | undefined): void {
  if (!key || key.trim().length < 20) {
    throw new Error(
      'Invalid or missing API key. Set PUBG_API_KEY in your .env file.\n' +
      'Get your key at: https://developer.pubg.com'
    );
  }
}

export function parsePlayerNames(input: string): string[] {
  return input
    .split(',')
    .map(n => sanitizePlayerName(n.trim()))
    .filter(n => n.length > 0)
    .slice(0, 4); // Max 4 players (squad size)
}

export function validateMatchCount(count: number): number {
  if (count < 1) return 1;
  if (count > 32) return 32;
  return Math.floor(count);
}
