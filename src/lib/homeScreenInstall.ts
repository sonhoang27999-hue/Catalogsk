export function phonePlatform(userAgent: string, touchPoints = 0): 'ios' | 'android' | null {
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && touchPoints > 1)) return 'ios';
  return /Android/i.test(userAgent) ? 'android' : null;
}

export function shouldOfferHomeScreen(userId: string | null, platform: string | null, standalone: boolean, dismissed: boolean) {
  return Boolean(userId && platform && !standalone && !dismissed);
}