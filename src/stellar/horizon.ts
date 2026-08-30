import type { TrustFlowClient } from '../client';
import { TrustFlowError } from '../errors';

interface HorizonSubmitResponse {
  hash: string;
  successful: boolean;
  ledger?: number;
  extras?: { result_codes?: { transaction?: string } };
}

export async function submitTransaction(
  client: TrustFlowClient,
  signedXdr: string,
): Promise<string> {
  const server = client.getServer();
  try {
    const result = await server.submitTransaction(
      (await import('@stellar/stellar-sdk')).TransactionBuilder.fromXDR(
        signedXdr,
        client.network === 'MAINNET'
          ? (await import('@stellar/stellar-sdk')).Networks.PUBLIC
          : (await import('@stellar/stellar-sdk')).Networks.TESTNET,
      ),
    );
    return (result as HorizonSubmitResponse).hash;
  } catch (e: unknown) {
    const err = e as { response?: { data?: { extras?: { result_codes?: { transaction?: string } } } } };
    throw new TrustFlowError(
      err?.response?.data?.extras?.result_codes?.transaction ?? 'Submission failed',
      'CONTRACT_ERROR',
      e,
    );
  }
}
