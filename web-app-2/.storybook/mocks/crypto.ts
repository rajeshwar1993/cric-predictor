// Mock Node.js crypto for Storybook (browser environment)
export function createHash() {
  return {
    update() {
      return this
    },
    digest() {
      return 'mocked-hash'
    },
  }
}

export default { createHash }
