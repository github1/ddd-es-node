module.exports = {
  verbose: true,
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': '<rootDir>/node_modules/babel-jest',
    '.(ts|tsx)': '<rootDir>/preprocessor.js'
  },
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'node'
  ],
  testRegex: '/spec/.*\\.(ts|js)x?$',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts'
  ]
};
