export class RateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private requests: number[];

  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();

    // Remove requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest) + 100;

      process.stderr.write(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...\n`);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      return this.waitIfNeeded();
    }

    this.requests.push(now);
  }

  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return this.maxRequests - this.requests.length;
  }
}
