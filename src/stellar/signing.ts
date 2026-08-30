import type { Transaction, FeeBumpTransaction } from '@stellar/stellar-sdk';

export type SignableTransaction = Transaction | FeeBumpTransaction;

export interface SignedTransaction {
  xdr: string;
  hash: string;
}

interface FreighterWindow {
  freighter?: {
    signTransaction(
      xdr: string,
      opts: { network: string },
    ): Promise<{ signedXDR: string }>;
  };
}

declare const window: FreighterWindow | undefined;

export async function signWithFreighter(
  transaction: SignableTransaction,
  network: string,
): Promise<SignedTransaction> {
  if (typeof window === 'undefined' || !window?.freighter) {
    throw new Error('Freighter wallet not available');
  }
  const { signedXDR } = await window.freighter.signTransaction(
    transaction.toEnvelope().toXDR('base64'),
    { network },
  );
  return { xdr: signedXDR, hash: transaction.hash().toString('hex') };
}
