module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  // db.test.js requires a real DB — exclude from default run
  testPathIgnorePatterns: ['/node_modules/', '/tests/db.test.js'],
  clearMocks: true,
  resetModules: true,
};
