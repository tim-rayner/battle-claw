export const PLATFORMS = {
  steam: 'steam',
  kakao: 'kakao',
  psn: 'psn',
  xbox: 'xbox',
} as const;

export type Platform = keyof typeof PLATFORMS;

export const VALID_PLATFORMS = Object.keys(PLATFORMS) as Platform[];

export const PLATFORM_LABELS: Record<Platform, string> = {
  steam: 'PC (Steam)',
  kakao: 'PC (Kakao)',
  psn: 'PlayStation',
  xbox: 'Xbox',
};
