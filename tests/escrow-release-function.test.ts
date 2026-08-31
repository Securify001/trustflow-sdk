import type { TrustFlowClient } from '../src/client';
import { releaseEscrow } from '../src/escrow/release';
import type { ReleaseEscrowParams } from '../src/types';

describe('releaseEscrow', () => {
  it('accepts ReleaseEscrowParams from the public top-level types module', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1234);
    const client = {} as TrustFlowClient;
    const params: ReleaseEscrowParams = {
      escrowId: 'escrow-1',
      caller: 'GABC',
    };

    await expect(releaseEscrow(client, params)).resolves.toBe('tx_release_escrow-1_1234');
  });
});
