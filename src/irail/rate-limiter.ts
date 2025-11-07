/**
 * Asynchronous queue-based rate limiter for limiting outbound HTTP calls.
 * Allows up to N requests every M seconds (configurable).
 *
 * Usage:
 *   const limiter = new RateLimiter(1, 1); // 1 req/sec
 *   await limiter.acquire();
 *   // ...do work
 *   release();
 */

export type QRelease = () => void;

export class RateLimiter {
  private queue: ((resolved: QRelease) => void)[] = [];
  private requestPer: number;
  private window: number;
  private requestTimes: { at: number | null }[] = [];
  private active = 0;
  private timer: NodeJS.Timeout | undefined;

  constructor(requestPer: number, window: number) {
    this.requestPer = requestPer;
    this.window = window;
  }

  /**
   * Acquire a permit for the rate limiter. Resolves with a release function
   * that must be called when the request is finished to log its completion.
   */
  acquire(): Promise<QRelease> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  private processQueue() {
    const now = Date.now();
    const windowStart = now - this.window * 1000;
    this.requestTimes = this.requestTimes.filter(
      (time) => !time.at || time.at > windowStart
    );
    if (this.requestTimes.length >= this.requestPer) {
      if (this.queue.length === 0) return;
      if (!this.timer) {
        const minTime = Math.min(
          ...this.requestTimes.map((r) => r.at ? r.at - windowStart : this.window * 1000)
        );
        this.timer = setTimeout(() => {
          this.timer = undefined;
          this.processQueue();
        }, minTime);
      }
      return;
    }
    const next = this.queue.shift();
    if (next) {
      const rqTime = { at: null as number | null };
      this.active++;
      this.requestTimes.push(rqTime);
      const release = () => {
        this.active--;
        rqTime.at = Date.now();
        this.processQueue();
      };
      next(release);
    }
  }
}
