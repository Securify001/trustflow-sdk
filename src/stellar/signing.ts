import type { Transaction, FeeBumpTransaction } from '@stellar/stellar-sdk';
import { getFreighter } from '../wallet/freighter';

export type SignableTransaction = Transaction | FeeBumpTransaction;

export interface SignedTransaction {
  xdr: string;
  hash: string;
}

export async function signWithFreighter(
  transaction: SignableTransaction,
  network: string,
): Promise<SignedTransaction> {
  const freighter = getFreighter();
  if (!freighter) {
    throw new Error('Freighter wallet not available');
  }
  const { signedXDR } = await freighter.signTransaction(
    transaction.toEnvelope().toXDR('base64'),
    { network },
  );
  return { xdr: signedXDR, hash: transaction.hash().toString('hex') };
}
