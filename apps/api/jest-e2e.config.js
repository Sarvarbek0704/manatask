/** End-to-end tests. Requires TEST_DATABASE_URL (a disposable Postgres). */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'test/.*\\.e2e-spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  testTimeout: 30000,
  moduleNameMapper: {
    '^@manatask/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
};
