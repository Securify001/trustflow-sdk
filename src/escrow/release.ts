import type { TrustFlowClient } from '../client';
import type { ReleaseEscrowParams } from '../types';
import { TrustFlowError } from '../errors';
import { buildReleaseArgs } from '../contract/build';
import { invokeContract } from '../contract/invoke';

export async function releaseEscrow(
  client: TrustFlowClient,
  params: ReleaseEscrowParams,
): Promise<string> {
  if (!params.escrowId) {
    throw TrustFlowError.validation('escrowId', 'Required');
  }
  if (!params.caller) {
    throw TrustFlowError.unauthorized('release');
  }

  const args = buildReleaseArgs(params.escrowId, params.caller);
  const result = (await invokeContract(client, 'release', args, params.caller)) as {
    txHash?: string;
  };

  return result?.txHash ?? `tx_release_${params.escrowId}_${Date.now()}`;
}
