// The /vitest entry augments vitest's Assertion interface with the jest-dom
// matchers (toBeInTheDocument, etc.). The bare '@testing-library/jest-dom'
// import only augments Jest's expect, which vitest 5 no longer type-checks
// against — tsc -b then fails on every .toBeInTheDocument() in the .tsx tests.
import '@testing-library/jest-dom/vitest'
