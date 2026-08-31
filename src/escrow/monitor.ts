import { TrustFlowEvent, EventHandler } from '../types/events';
import { logger } from '../utils/logger';

/**
 * The phase in which a polling error occurred.
 */
export type EscrowMonitorErrorPhase = 'fetch' | 'handler';

/**
 * Context passed to the {@link EscrowMonitor.onError} callback describing where
 * the error originated and, for handler failures, the event and handler involved.
 */
export interface EscrowMonitorErrorContext {
  /** The phase of polling in which the error occurred. */
  phase: EscrowMonitorErrorPhase;
  /** The event that triggered the failing handler, when `phase === 'handler'`. */
  event?: TrustFlowEvent;
  /** The handler that threw, when `phase === 'handler'`. */
  handler?: EventHandler;
}

/**
 * Callback invoked by {@link EscrowMonitor} when a poll (fetchFn) or an event
 * handler fails. Consumers that register this callback can react to otherwise
 * silently-discarded errors.
 */
export type EscrowMonitorOnError = (
  error: unknown,
  context: EscrowMonitorErrorContext
) => void;

export class EscrowMonitor {
  private handlers = new Map<string, Set<EventHandler>>();
  private pollingInterval?: ReturnType<typeof setInterval>;
  private errorCallback?: EscrowMonitorOnError;

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
   * Register an optional error callback that is invoked whenever a poll
   * (`fetchFn`) or an event handler fails. Without it, failures are only
   * surfaced through the SDK's logger and existing polling behavior is
   * unchanged.
   *
   * @param callback - Called with the thrown error and context describing
   *   whether it originated from fetching events or handling an event.
   * @returns `this` for chaining.
   */
  onError(callback: EscrowMonitorOnError): this {
    this.errorCallback = callback;
    return this;
  }

  startPolling(intervalMs = 5000, fetchFn: () => Promise<TrustFlowEvent[]>): void {
    this.pollingInterval = setInterval(async () => {
      let events: TrustFlowEvent[];
      try {
        events = await fetchFn();
      } catch (error) {
        logger.error('Failed to fetch events during polling', error);
        this.errorCallback?.(error, { phase: 'fetch' });
        return;
      }
      for (const event of events) {
        const handlers = this.handlers.get(event.type) ?? new Set();
        const wildcards = this.handlers.get('*') ?? new Set();
        [...handlers, ...wildcards].forEach((h) => {
          Promise.resolve(h(event)).catch((error: unknown) => {
            logger.error('Event handler failed', { error, event });
            this.errorCallback?.(error, { phase: 'handler', event, handler: h });
          });
        });
      }
    }, intervalMs);
  }

  stopPolling(): void {
    clearInterval(this.pollingInterval);
  }
}
