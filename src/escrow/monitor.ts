import type { ParsedTrustFlowEvent, EventHandler } from '../types/events';

/**
 * Subscribes handlers to parsed TrustFlow events and dispatches them.
 *
 * Events come in as {@link ParsedTrustFlowEvent} — exactly what
 * `parseEvents(rawEvents, contractId)` (`src/events.ts`) produces — so a
 * caller can wire the SDK's own parser straight into this without any
 * translation step (#108). Handlers narrow `event.data` by switching on
 * `event.type`.
 */
export class EscrowMonitor {
  private handlers = new Map<string, Set<EventHandler>>();
  private pollingInterval?: ReturnType<typeof setInterval>;

  on(type: string, handler: EventHandler): this {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return this;
  }

  off(type: string, handler: EventHandler): this {
    this.handlers.get(type)?.delete(handler);
    return this;
  }

  /**
   * Dispatch a batch of already-parsed events to their registered handlers
   * (plus any `'*'` wildcard handlers). Handler rejections are logged, not
   * thrown, so one bad handler can't stop the rest.
   */
  deliver(events: ParsedTrustFlowEvent[]): void {
    for (const event of events) {
      const handlers = this.handlers.get(event.type) ?? new Set<EventHandler>();
      const wildcards = this.handlers.get('*') ?? new Set<EventHandler>();
      [...handlers, ...wildcards].forEach((h) => {
        Promise.resolve(h(event)).catch((err) => console.error(err));
      });
    }
  }

  startPolling(
    intervalMs = 5000,
    fetchFn: () => Promise<ParsedTrustFlowEvent[]>,
  ): void {
    this.pollingInterval = setInterval(async () => {
      const events = await fetchFn().catch(() => [] as ParsedTrustFlowEvent[]);
      this.deliver(events);
    }, intervalMs);
  }

  stopPolling(): void {
    clearInterval(this.pollingInterval);
  }
}
