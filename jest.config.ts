import type { Config } from 'jest';

const config: Config = {
  // Test discovery must not crawl archived UI trees under legacy/.
  roots: ['<rootDir>/tests'],
  testEnvironment: 'jsdom',
  globalSetup: '<rootDir>/tests/global-setup.js',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.tsx',
    '<rootDir>/tests/**/*.spec.ts',
    '<rootDir>/tests/**/*.spec.tsx'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/visual/',
    '<rootDir>/tests/performance/',
    '<rootDir>/tests/security/'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/app/layout.tsx',
    '!src/lib/db.ts',
    '!src/lib/prisma.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/lib/image.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/lib/ai-provider-detection.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/app/api/analyze/route.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/app/api/trichome-analysis/route.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  moduleNameMapper: {
    '^@/tests/(.*)$': '<rootDir>/tests/$1',
    '^@/tests/utils/(.*)$': '<rootDir>/tests/utils/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@agentclientprotocol/sdk$': '<rootDir>/tests/mocks/agentclientprotocol-sdk.ts'
  },
  moduleDirectories: ['node_modules', '<rootDir>'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      '<rootDir>/tests/jest-typescript-transformer.cjs'
    ]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(sharp|heic-convert|libheif-js)/)'
  ],
  verbose: true,
  // Tests share a mocked provider registry and a SQLite integration fixture.
  // Serial workers avoid cross-worker teardown races while remaining faster
  // than the previous parallel configuration on the supported local setup.
  maxWorkers: 1,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 30000,
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage',
        outputName: 'junit.xml',
        suiteName: 'CultivAI Pro Tests'
      }
    ]
  ],
  snapshotSerializers: []
};

export default config;
