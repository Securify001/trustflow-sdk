import { rpc, Contract } from '@stellar/stellar-sdk';
import { SOROBAN_RPC_URLS } from '../constants';
import type { TrustFlowClient } from '../client';

interface FakeEnvelope {
  toXDR(): string;
}

export async function readContractState(
  client: TrustFlowClient,
  method: string,
  args: unknown[] = [],
): Promise<unknown> {
  const rpcUrl = SOROBAN_RPC_URLS[client.network];
  const server = new rpc.Server(rpcUrl);
  const contract = new Contract(client.contractId);
  const _operation = contract.call(method, ...(args as any[]));
  const result = await server.simulateTransaction({
    toEnvelope: () => ({ toXDR: () => '' }) as FakeEnvelope,
  } as rpc.Api.Transaction);
  return result;
}
