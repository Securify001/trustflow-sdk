import type { Transaction, FeeBumpTransaction } from '@stellar/stellar-sdk';
import { TrustFlowError } from '../errors';

export type SignableTransaction = Transaction | FeeBumpTransaction;

export interface SignedTransaction {
  xdr: string;
  hash: string;
}

export async function signWithFreighter(
  transaction: SignableTransaction,
  network: string,
): Promise<SignedTransaction> {
  if (typeof window === 'undefined' || !(window as any).freighter) {
    throw new TrustFlowError('Freighter wallet not available', 'UNAUTHORIZED');
  }
  const { signedXDR } = await (window as any).freighter.signTransaction(
    transaction.toEnvelope().toXDR('base64'),
    { network },
  );
  return { xdr: signedXDR, hash: transaction.hash().toString('hex') };
}
