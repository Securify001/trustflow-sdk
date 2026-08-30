import type { TrustFlowClient } from '../client';
import { EscrowStatus } from '../types';
import type { CreateEscrowParams, Escrow } from '../types';
import { TrustFlowError } from '../errors';
import { ESCROW_MIN_AMOUNT_STROOPS } from '../constants';
import { buildCreateEscrowArgs } from '../contract/build';
import { invokeContract } from '../contract/invoke';

export async function createEscrow(
  client: TrustFlowClient,
  params: CreateEscrowParams,
): Promise<Escrow> {
  if (params.amountStroops < ESCROW_MIN_AMOUNT_STROOPS) {
    throw TrustFlowError.validation('amountStroops', `Minimum is ${ESCROW_MIN_AMOUNT_STROOPS}`);
  }
  if (!params.sender || !params.recipient) {
    throw TrustFlowError.validation('sender/recipient', 'Both addresses are required');
  }

  const args = buildCreateEscrowArgs({
    sender: params.sender,
    recipient: params.recipient,
    amountStroops: params.amountStroops,
    durationBlocks: params.durationBlocks,
  });

  await invokeContract(client, 'create_escrow', args, params.sender);

  return {
    id: `escrow-${Date.now()}`,
    sender: params.sender,
    recipient: params.recipient,
    amount: params.amountStroops,
    status: EscrowStatus.Pending,
    createdAt: Date.now(),
    metadata: params.metadata,
  };
}
