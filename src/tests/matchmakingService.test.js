const mm = require('../services/matchmakingService');

function resetState() {
  ['a', 'b', 'c', 'd', 'e'].forEach((id) => mm.dequeue(id));
  ['a', 'b', 'c', 'd', 'e'].forEach((id) => mm.removePair(id));
  ['a', 'b', 'c', 'd', 'e'].forEach((id) => mm.clearSession(id));
}

beforeEach(resetState);

describe('Queue management', () => {
  test('enqueue adds user to queue', () => {
    mm.enqueue('a');
    expect(mm.isInQueue('a')).toBe(true);
  });

  test('enqueue does not add duplicate', () => {
    mm.enqueue('a');
    mm.enqueue('a');
    const partner = mm.tryMatch('b');
    expect(partner).toBe('a');
    expect(mm.isInQueue('a')).toBe(false);
  });

  test('dequeue removes user from queue', () => {
    mm.enqueue('a');
    mm.dequeue('a');
    expect(mm.isInQueue('a')).toBe(false);
  });

  test('dequeue on non-existent user is a no-op', () => {
    expect(() => mm.dequeue('ghost')).not.toThrow();
  });
});

describe('Matchmaking', () => {
  test('tryMatch returns null when queue is empty', () => {
    expect(mm.tryMatch('a')).toBeNull();
  });

  test('tryMatch returns null when only self is in queue', () => {
    mm.enqueue('a');
    expect(mm.tryMatch('a')).toBeNull();
  });

  test('tryMatch pairs two users and removes both from queue', () => {
    mm.enqueue('a');
    mm.enqueue('b');
    const partner = mm.tryMatch('b');
    expect(partner).toBe('a');
    expect(mm.isInQueue('a')).toBe(false);
    expect(mm.isInQueue('b')).toBe(false);
  });

  test('matched users are registered as active pair', () => {
    mm.enqueue('a');
    mm.enqueue('b');
    mm.tryMatch('b');
    expect(mm.isInChat('a')).toBe(true);
    expect(mm.isInChat('b')).toBe(true);
    expect(mm.getPartner('a')).toBe('b');
    expect(mm.getPartner('b')).toBe('a');
  });

  test('getPartner returns null for unmatched user', () => {
    expect(mm.getPartner('nobody')).toBeNull();
  });
});

describe('Pair removal', () => {
  test('removePair clears both sides', () => {
    mm.enqueue('a');
    mm.enqueue('b');
    mm.tryMatch('b');
    mm.removePair('a');
    expect(mm.isInChat('a')).toBe(false);
    expect(mm.isInChat('b')).toBe(false);
  });

  test('removePair returns the partner ID', () => {
    mm.enqueue('a');
    mm.enqueue('b');
    mm.tryMatch('b');
    const returned = mm.removePair('a');
    expect(returned).toBe('b');
  });

  test('removePair on unpaired user returns undefined', () => {
    expect(mm.removePair('ghost')).toBeUndefined();
  });
});

describe('Session tracking', () => {
  test('setSession and getSession work correctly', () => {
    mm.setSession('a', 'session-uuid-123');
    expect(mm.getSession('a')).toBe('session-uuid-123');
  });

  test('clearSession removes session', () => {
    mm.setSession('a', 'session-uuid-123');
    mm.clearSession('a');
    expect(mm.getSession('a')).toBeNull();
  });

  test('getSession returns null for unknown socket', () => {
    expect(mm.getSession('unknown')).toBeNull();
  });
});
