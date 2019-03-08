module.exports = {
  verbose: true,
  testEnvironment: 'node',
  transform: {
    "^.+\\.js$": '<rootDir>/node_modules/babel-jest',
    "^.+\\.ts$": '<rootDir>/node_modules/ts-jest'
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
