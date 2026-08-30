/**
 * JSON-RPC response interface for simulateTransaction
 */
export interface SimulateTransactionResponse {
  jsonrpc: string;
  id: number;
  result?: {
    error?: {
      message: string;
    };
    transactionData: string;
    cost?: {
      cpuInsns: string;
      memBytes: string;
    };
  };
}

export async function simulateAndAssemble(
  rpcUrl: string,
  txXdr: string
): Promise<{ xdr: string; cost: { cpuInsns: string; memBytes: string } }> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'simulateTransaction',
      params: { transaction: txXdr },
    }),
  });

  // Type assertion for the JSON response
  const response = (await res.json()) as SimulateTransactionResponse;

  if (response.result?.error) {
    throw new Error(response.result.error.message);
  }

  if (!response.result?.transactionData) {
    throw new Error('Invalid response: missing transactionData');
  }

  return {
    xdr: response.result.transactionData,
    cost: response.result.cost ?? { cpuInsns: '0', memBytes: '0' },
  };
}