import { describe, expect, test } from 'bun:test';
import { phonePlatform, shouldOfferHomeScreen } from './homeScreenInstall';

describe('account home-screen invitation', () => {
  test('guests never receive the invitation', () => {
    expect(shouldOfferHomeScreen(null, 'android', false, false)).toBe(false);
    expect(shouldOfferHomeScreen('account', 'android', false, false)).toBe(true);
  });
  test('installed apps do not receive the invitation', () => {
    expect(shouldOfferHomeScreen('account', 'ios', true, false)).toBe(false);
  });
  test('dismissal lasts only for the current visit state', () => {
    expect(shouldOfferHomeScreen('account', 'ios', false, true)).toBe(false);
    expect(shouldOfferHomeScreen('account', 'ios', false, false)).toBe(true);
  });
  test('phones and iPads are supported, desktop browsers are not offered installation', () => {
    expect(phonePlatform('Mozilla iPhone')).toBe('ios');
    expect(phonePlatform('Mozilla Android')).toBe('android');
    expect(phonePlatform('Mozilla Macintosh', 5)).toBe('ios');
    expect(phonePlatform('Mozilla Windows')).toBe(null);
  });
});