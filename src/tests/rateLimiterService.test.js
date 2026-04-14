jest.mock('../config', () => ({
  rateLimit: { maxMessages: 3, windowMs: 1000 },
  maxMessageLength: 500,
}));

const { isRateLimited, clearRateLimit } = require('../services/rateLimiterService');

beforeEach(() => {
  clearRateLimit('user1');
  clearRateLimit('user2');
});

describe('Rate limiting', () => {
  test('allows messages under the limit', () => {
    expect(isRateLimited('user1')).toBe(false);
    expect(isRateLimited('user1')).toBe(false);
    expect(isRateLimited('user1')).toBe(false);
  });

  test('blocks the 4th message within the window', () => {
    isRateLimited('user1');
    isRateLimited('user1');
    isRateLimited('user1');
    expect(isRateLimited('user1')).toBe(true);
  });

  test('different users have independent limits', () => {
    isRateLimited('user1');
    isRateLimited('user1');
    isRateLimited('user1');
    expect(isRateLimited('user2')).toBe(false);
  });

  test('clearRateLimit resets the counter', () => {
    isRateLimited('user1');
    isRateLimited('user1');
    isRateLimited('user1');
    clearRateLimit('user1');
    expect(isRateLimited('user1')).toBe(false);
  });

  test('allows messages again after window expires', async () => {
    isRateLimited('user1');
    isRateLimited('user1');
    isRateLimited('user1');
    expect(isRateLimited('user1')).toBe(true);

    await new Promise((r) => setTimeout(r, 1100));
    expect(isRateLimited('user1')).toBe(false);
  }, 3000);
});
