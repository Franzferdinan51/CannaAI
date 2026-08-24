import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LM_STUDIO_URL = 'http://localhost:1234';
process.env.OPENROUTER_API_KEY = 'test-api-key';
// Keep every Jest worker pointed at the repository's dedicated SQLite test DB.
// The previous root-relative path created a new empty database, so integration
// suites failed before reaching their route assertions.
// Prisma resolves SQLite URLs relative to prisma/schema.prisma, so this maps
// to the repository's prisma/test.db file.
process.env.DATABASE_URL = 'file:./test.db';

// Use Next's real server response implementation in Node-backed integration
// tests. A constructor-only mock breaks route handlers that call
// `NextResponse.json()` and hides real HTTP behavior.
jest.mock('next/server', () => jest.requireActual('next/server'));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    plantAnalysis: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    plant: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    strain: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(async (callback) => callback(prisma))
  }
}));

// Mock Sharp
jest.mock('sharp', () => {
  const mockSharpInstance = {
    resize: jest.fn(() => mockSharpInstance),
    jpeg: jest.fn(() => mockSharpInstance),
    png: jest.fn(() => mockSharpInstance),
    webp: jest.fn(() => mockSharpInstance),
    avif: jest.fn(() => mockSharpInstance),
    rotate: jest.fn(() => mockSharpInstance),
    flatten: jest.fn(() => mockSharpInstance),
    // Keep the optional sharp mock compatible with image-simple's real async
    // pipeline so integration tests exercise route behavior without a native
    // image codec and without falling into the production fallback path.
    toBuffer: jest.fn().mockResolvedValue(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])),
    metadata: jest.fn()
  };
  const mockSharp = jest.fn(() => mockSharpInstance);
  return mockSharp;
});

// Mock heic-convert
jest.mock('heic-convert', () => ({
  convert: jest.fn()
}));

// Mock fetch globally
global.fetch = jest.fn();

// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('DeprecationWarning') ||
     args[0].includes('ExperimentalWarning'))
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

// Global test utilities
global.mockImageBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

global.createMockImageData = (format: 'jpeg' | 'png' | 'heic' = 'jpeg') => {
  const formats = {
    jpeg: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
    png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    heic: 'data:image/heic;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAhtZGF0AAAA'
  };
  return formats[format];
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
