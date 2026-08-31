/**
 * #107 — `useEscrow`'s create / release paths. React is stubbed so the hook
 * runs under Jest's node environment: `useState` is backed by a per-render
 * cell array, `useCallback` returns the function unchanged.
 */

let cells: unknown[] = [];
let cursor = 0;

jest.mock('react', () => ({
  useState: (init: unknown) => {
    const i = cursor++;
    if (!(i in cells)) {
      cells[i] = typeof init === 'function' ? (init as () => unknown)() : init;
    }
    const setter = (next: unknown) => {
      cells[i] = typeof next === 'function' ? (next as (p: unknown) => unknown)(cells[i]) : next;
    };
    return [cells[i], setter];
  },
  useCallback: (fn: unknown) => fn,
}));

jest.mock('../src/escrow', () => ({
  createEscrow: jest.fn(),
  releaseEscrow: jest.fn(),
}));

import * as escrow from '../src/escrow';
import { useEscrow } from '../src/hooks/useEscrow';

const mockCreate = escrow.createEscrow as jest.Mock;
const mockRelease = escrow.releaseEscrow as jest.Mock;

function render() {
  cells = [];
  cursor = 0;
  return useEscrow({} as never);
}

// hook returns [loading, error, escrow] cells in this order
const loading = () => cells[0] as boolean;
const error = () => cells[1] as string | null;

describe('useEscrow — create (#107)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the escrow, stores it, and clears error/loading on success', async () => {
    const created = { id: 'escrow-1', status: 'PENDING' };
    mockCreate.mockResolvedValueOnce(created);

    const hook = render();
    const result = await hook.create({
      sender: 'GA', recipient: 'GB', amountStroops: 100n,
    } as never);

    expect(result).toBe(created);
    expect(mockCreate).toHaveBeenCalledWith({}, expect.objectContaining({ sender: 'GA' }));
    expect(cells[2]).toBe(created); // escrow cell
    expect(error()).toBeNull();
    expect(loading()).toBe(false);
  });

  it('surfaces the error message and rethrows on failure', async () => {
    mockCreate.mockRejectedValueOnce(new Error('minimum amount not met'));

    const hook = render();
    await expect(hook.create({} as never)).rejects.toThrow('minimum amount not met');

    expect(error()).toBe('minimum amount not met');
    expect(loading()).toBe(false);
  });
});

describe('useEscrow — release (#107)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the release result on success', async () => {
    mockRelease.mockResolvedValueOnce('tx_release_abc');

    const hook = render();
    const result = await hook.release('escrow-1', 'GA');

    expect(result).toBe('tx_release_abc');
    expect(mockRelease).toHaveBeenCalledWith({}, { escrowId: 'escrow-1', caller: 'GA' });
    expect(error()).toBeNull();
    expect(loading()).toBe(false);
  });

  it('surfaces the error message and rethrows on failure', async () => {
    mockRelease.mockRejectedValueOnce(new Error('unauthorized'));

    const hook = render();
    await expect(hook.release('escrow-1', 'GA')).rejects.toThrow('unauthorized');

    expect(error()).toBe('unauthorized');
    expect(loading()).toBe(false);
  });
});
