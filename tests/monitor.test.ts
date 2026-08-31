import { EscrowMonitor } from '../src/escrow/monitor';

describe('EscrowMonitor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('registers and fires event handlers', async () => {
    const monitor = new EscrowMonitor();
    let received: any = null;
    monitor.on('escrow.created', async e => { received = e; });
    // Simulate event
    const event = { type: 'escrow.created' as const, escrowId: '1', payload: {}, blockNumber: 1, txHash: 'abc', timestamp: Date.now() };
    const handlers = (monitor as any).handlers.get('escrow.created') as Set<any>;
    await Promise.all([...handlers].map((h: any) => h(event)));
    expect(received?.escrowId).toBe('1');
  });

  it('removes handler with off()', () => {
    const monitor = new EscrowMonitor();
    const h = () => {};
    monitor.on('escrow.created', h);
    monitor.off('escrow.created', h);
    expect((monitor as any).handlers.get('escrow.created')?.size).toBe(0);
  });

  describe('onError', () => {
    const event = {
      type: 'escrow.created' as const,
      escrowId: '1',
      payload: {},
      blockNumber: 1,
      txHash: 'abc',
      timestamp: Date.now(),
    };

    it('invokes onError when fetchFn rejects', async () => {
      const monitor = new EscrowMonitor();
      const onError = jest.fn();
      monitor.onError(onError);
      const fetchFn = jest.fn().mockRejectedValue(new Error('network down'));
      monitor.startPolling(1000, fetchFn);

      await jest.advanceTimersByTimeAsync(1000);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0]).toEqual(new Error('network down'));
      expect(onError.mock.calls[0][1].phase).toBe('fetch');
      expect(fetchFn).toHaveBeenCalled();

      monitor.stopPolling();
    });

    it('invokes onError when an event handler rejects', async () => {
      const monitor = new EscrowMonitor();
      const onError = jest.fn();
      monitor.onError(onError);
      const boom = jest.fn().mockRejectedValue(new Error('handler boom'));
      monitor.on('escrow.created', boom);
      const fetchFn = jest.fn().mockResolvedValue([event]);
      monitor.startPolling(1000, fetchFn);

      await jest.advanceTimersByTimeAsync(1000);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0]).toEqual(new Error('handler boom'));
      expect(onError.mock.calls[0][1].phase).toBe('handler');

      monitor.stopPolling();
    });
  });
});
