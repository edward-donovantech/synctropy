import '@testing-library/jest-dom'

// Mock ResizeObserver for recharts testing
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any
