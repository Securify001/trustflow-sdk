import { EscrowParams } from '../types/index';
import { TrustFlowError } from '../errors';

export class EscrowBuilder {
  private params: Partial<EscrowParams> = {};

  setDepositor(address: string): this {
    this.params.depositor = address;
    return this;
  }
  setBeneficiary(address: string): this {
    this.params.beneficiary = address;
    return this;
  }
  setAmount(xlm: string): this {
    this.params.amountXLM = xlm;
    return this;
  }
  setToken(address: string): this {
    this.params.tokenAddress = address;
    return this;
  }
  setDeadline(blocks: number): this {
    this.params.deadlineBlocks = blocks;
    return this;
  }

  build(): EscrowParams {
    if (!this.params.depositor) {
      throw TrustFlowError.validation('depositor', 'depositor required');
    }
    if (!this.params.beneficiary) {
      throw TrustFlowError.validation('beneficiary', 'beneficiary required');
    }
    if (!this.params.amountXLM) {
      throw TrustFlowError.validation('amountXLM', 'amountXLM required');
    }
    return this.params as EscrowParams;
  }
}
