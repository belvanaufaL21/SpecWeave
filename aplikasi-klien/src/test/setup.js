import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock console.error to avoid noise in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Mock performance.memory for tests
if (!global.performance) {
  global.performance = {}
}

if (!global.performance.memory) {
  global.performance.memory = {
    usedJSHeapSize: 1024 * 1024, // 1MB
    totalJSHeapSize: 10 * 1024 * 1024, // 10MB
    jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
  }
}

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock TestingService methods
vi.mock('../services/testingService', () => ({
  default: {
    getCachedTestResult: vi.fn(() => null),
    cacheTestResult: vi.fn(),
    clearTestResultCache: vi.fn(),
    formatTestResult: vi.fn((result) => result),
    getMetricDisplay: vi.fn((value) => value !== null && value !== undefined ? `${(value * 100).toFixed(1)}%` : '0.0%'),
  }
}));

// Mock useTestingStatePersistence hook
vi.mock('../hooks/useTestingStatePersistence', () => ({
  default: () => ({
    saveFormData: vi.fn(),
    getFormData: vi.fn(() => null),
    saveModalState: vi.fn(),
    getModalState: vi.fn(() => null),
    clearFormData: vi.fn(),
    clearModalState: vi.fn(),
  })
}));
