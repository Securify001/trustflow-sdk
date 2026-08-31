import { rpc, Contract, Account, TransactionBuilder, BASE_FEE, scValToNative } from '@stellar/stellar-sdk';
import { SOROBAN_RPC_URLS } from '../constants';
import type { TrustFlowClient } from '../client';
import { TrustFlowError } from '../errors';

export async function readContractState(
  client: TrustFlowClient,
  method: string,
  args: unknown[] = [],
): Promise<unknown> {
  const rpcUrl = SOROBAN_RPC_URLS[client.network];
  const server = new rpc.Server(rpcUrl);
  const contract = new Contract(client.contractId);
  const operation = contract.call(method, ...(args as any[]));

  // Use a dummy account for simulation
  const dummyAccount = new Account(
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    '0'
  );

  const tx = new TransactionBuilder(dummyAccount, {
    fee: BASE_FEE,
    networkPassphrase: client.getNetworkPassphrase(),
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const result = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(result as any)) {
    throw new TrustFlowError('Read simulation failed', 'SIMULATION_ERROR');
  }

  const retval = (result as any).result?.retval;
  return retval ? scValToNative(retval) : undefined;
}
