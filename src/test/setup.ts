import '@testing-library/jest-dom'

// jsdom doesn't implement HTMLMediaElement.prototype.play — stub it so tests
// involving <video> don't throw unhandled errors.
window.HTMLMediaElement.prototype.play = () => Promise.resolve()
