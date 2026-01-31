import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LM_STUDIO_URL = 'http://localhost:1234';
process.env.OPENROUTER_API_KEY = 'test-api-key';
process.env.DATABASE_URL = 'file:./test.db';

// Mock Next.js modules
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    NextRequest: jest.fn().mockImplementation((url, init) => ({
      url,
      ...init,
      headers: new Headers(init?.headers || {}),
      json: async () => JSON.parse(init?.body || '{}'),
    })),
    NextResponse: {
      json: jest.fn((body, init) => ({
        body,
        status: init?.status || 200,
        headers: new Headers(init?.headers || {}),
      })),
      next: jest.fn(() => ({ headers: new Headers() })),
    },
  };
});

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
  const mockSharp = jest.fn(() => mockSharpInstance);
  const mockSharpInstance = {
    resize: jest.fn(() => mockSharpInstance),
    jpeg: jest.fn(() => mockSharpInstance),
    png: jest.fn(() => mockSharpInstance),
    webp: jest.fn(() => mockSharpInstance),
    avif: jest.fn(() => mockSharpInstance),
    rotate: jest.fn(() => mockSharpInstance),
    flatten: jest.fn(() => mockSharpInstance),
    toBuffer: jest.fn(),
    metadata: jest.fn()
  };
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
