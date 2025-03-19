import '@testing-library/jest-dom'
import { jest } from '@jest/globals'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: unknown) => ({
    matches: false,
    media: query as string,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

// Mock window.requestAnimationFrame
global.requestAnimationFrame = (callback) => setTimeout(callback, 0)
global.cancelAnimationFrame = (id) => clearTimeout(id) 