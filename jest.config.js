module.exports = {
  verbose: true,
  testEnvironment: 'node',
  transform: {
    "^.+\\.js$": 'babel-jest',
    "^.+\\.ts$": 'ts-jest'
  },
  moduleFileExtensions: [
    'ts',
    'js',
    'node'
  ],
  globals: {
    "ts-jest": {
      diagnostics: {
        warnOnly: true
      }
    }
  },
  testRegex: '.*\\.test\\.(js|ts)$',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts'
  ]
};
