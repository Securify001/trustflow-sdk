import { EscrowMonitor } from '../src/escrow/monitor';
import type { ParsedTrustFlowEvent } from '../src/events';

function createdEvent(escrowId: string): ParsedTrustFlowEvent {
  return {
    type: 'escrow_created',
    contractId: 'CABC',
    ledger: 1,
    timestamp: '2024-01-01T00:00:00Z',
    id: `ev-${escrowId}`,
    data: { escrowId, sender: 'GS', recipient: 'GR', amount: 1n },
  };
}

describe('EscrowMonitor', () => {
  it('registers and fires event handlers', async () => {
    const monitor = new EscrowMonitor();
    let received: ParsedTrustFlowEvent | null = null;
    monitor.on('escrow_created', async (e) => {
      received = e;
    });

    monitor.deliver([createdEvent('1')]);
    await Promise.resolve();

    expect(received).not.toBeNull();
    expect(received!.type).toBe('escrow_created');
    if (received!.type === 'escrow_created') {
      expect(received!.data.escrowId).toBe('1');
    }
  });

  it('fires wildcard handlers too', async () => {
    const monitor = new EscrowMonitor();
    const seen: string[] = [];
    monitor.on('*', (e) => {
      seen.push(e.type);
    });

    monitor.deliver([createdEvent('1'), createdEvent('2')]);
    await Promise.resolve();

    expect(seen).toEqual(['escrow_created', 'escrow_created']);
  });

  it('removes handler with off()', () => {
    const monitor = new EscrowMonitor();
    const h = (): void => {};
    monitor.on('escrow_created', h);
    monitor.off('escrow_created', h);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((monitor as any).handlers.get('escrow_created')?.size).toBe(0);
  });
});
