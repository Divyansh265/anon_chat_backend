const { v4: uuidv4 } = require('uuid');

function generateSessionId() {
  return uuidv4();
}

function generateAnonName() {
  const adjectives = ['Silent', 'Hidden', 'Quiet', 'Shadow', 'Mystic', 'Wandering', 'Unknown'];
  const nouns = ['Fox', 'Wolf', 'Owl', 'Bear', 'Hawk', 'Lynx', 'Raven'];
  const num = Math.floor(Math.random() * 9000) + 1000;
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}${noun}${num}`;
}

module.exports = { generateSessionId, generateAnonName };
