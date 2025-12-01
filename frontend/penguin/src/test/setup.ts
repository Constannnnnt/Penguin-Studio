import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
