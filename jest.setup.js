import '@testing-library/jest-dom'

// Polyfill TextEncoder/TextDecoder for Node.js environment
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock fetch globally
global.fetch = jest.fn()

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url')
global.URL.revokeObjectURL = jest.fn()

// Mock document methods
const mockElement = {
  href: '',
  download: '',
  click: jest.fn(),
}

Object.defineProperty(document, 'createElement', {
  value: jest.fn(() => mockElement),
})

Object.defineProperty(document.body, 'appendChild', {
  value: jest.fn(),
})

Object.defineProperty(document.body, 'removeChild', {
  value: jest.fn(),
})

// Mock window.getComputedStyle for React DOM
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
})

// Mock CSS properties that React DOM checks for
Object.defineProperty(window, 'CSS', {
  value: {
    supports: () => false,
  },
})

// Mock CSS animation properties for React DOM
Object.defineProperty(window, 'CSSStyleDeclaration', {
  value: function() {
    return {
      WebkitAnimation: '',
      animation: '',
    }
  }
})

// Set up a basic DOM environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock HTMLElement.prototype for CSS animations
Object.defineProperty(HTMLElement.prototype, 'style', {
  value: {
    WebkitAnimation: '',
    animation: '',
  },
  writable: true,
})
