# TrustFlow SDK API Reference

## TrustFlowEscrowClient
- `createEscrow(params)` — create a new escrow; encodes contract call arguments via `buildCreateEscrowArgs`
- `fund(escrowId, funderAddress, amountStroops, tokenAddress?)` — transfer an asset (e.g. USDC via
  its Soroban token contract) into an existing escrow to be locked until release; encodes contract
  call arguments via `buildFundArgs`. Omit `tokenAddress` to use the escrow's native asset.
- `releaseEscrow(id, signer)` — release funds to beneficiary
- `claim(escrowId, claimantAddress)` — beneficiary-side shortcut to withdraw already-cleared escrow funds
- `getEscrow(id)` — read escrow state from contract
- `getGigs(params)` — fetch paginated gigs via backend API with automatic retries for transient failures (`429`, `5xx`, network)

## disputeEscrow (`src/escrow/dispute.ts`)
- `disputeEscrow(client, { escrowId, caller, reason })` — raises a dispute directly against the
  TrustFlow contract; encodes contract call arguments via `buildDisputeArgs`. Distinct from
  `DisputeClient.raiseDispute` below, which records the dispute with the backend API instead of
  the on-chain contract.

## ProfileClient
- `new ProfileClient(apiUrl, token, options?)`
- `.getProfile(address)` — fetch a user's profile (automatic retry on transient backend failures)
- `.updateProfile(address, params)` — update a user's profile (automatic retry on transient backend failures)

## IPFSStorage
- `new IPFSStorage(config?)` — `config.apiUrl` (default: web3.storage-compatible upload API), `config.apiKey`, `config.gatewayUrl`
- `.upload(file, options?)` — uploads a `Buffer`/`Uint8Array`; returns `SDKResult<{ cid, url }>`
- Also available as `client.storage.upload(file)` on `TrustFlowClient` (configure via `new TrustFlowClient({ ipfs: { apiKey } })`)

## EscrowBuilder
Fluent builder: `.setDepositor().setBeneficiary().setAmount().build()`

## EscrowMonitor
- `.on(event, handler)` — subscribe to escrow events
- `.startPolling(intervalMs, fetchFn)` — begin polling

## DisputeClient
- `.raiseDispute(params)` — raise a dispute (automatic retry on transient backend failures)
- `.getDispute(escrowId)` — get dispute status (automatic retry on transient backend failures)

## Auth
- `requestChallenge(apiUrl, address, options?)` — get signing challenge with retry-aware backend transport
- `verifyAndGetToken(apiUrl, address, signature, options?)` — exchange signature for JWT with retry-aware backend transport

## Validation Schemas
Zod runtime schemas (`src/schemas.ts`) — the same ones the SDK uses internally — exported from
the package root so frontend code can validate form/input data before calling the SDK, without
re-implementing the rules:

- `StellarAddressSchema`, `ContractIdSchema`, `StroopsSchema`, `NetworkSchema` — primitives
- `CreateEscrowSchema`, `ReleaseEscrowSchema`, `DisputeEscrowSchema` — escrow operation inputs
- `ClientConfigSchema` — `new TrustFlowClient(...)` config
- Inferred types `CreateEscrowInput`, `ReleaseEscrowInput`, `DisputeEscrowInput` are exported
  alongside their schemas. (`Network`/`ClientConfig` are not re-exported under those names from
  the root — they'd collide with the existing plain TS types of the same name; derive them
  yourself with `z.infer<typeof ClientConfigSchema>` / `z.infer<typeof NetworkSchema>` if needed.)

```typescript
import { CreateEscrowSchema } from '@trustflow/sdk';

const result = CreateEscrowSchema.safeParse(formValues);
if (!result.success) {
  showFormErrors(result.error.flatten());
}
```

## Backend API Retry Behavior
- Backend API endpoints now use a shared Axios transport configured with `axios-retry`.
- Default retry policy: 3 retries, exponential backoff (250ms base, 2000ms max cap).
- Retry conditions: network errors, HTTP `429`, and HTTP `5xx` responses.
- Non-transient `4xx` responses are returned without retry.

## TransactionPipeline
Unified pipeline for assembling, simulating, fee-adjusting, fee-bumping, and retrying
Soroban transactions against RPC. Every method returns a `PipelineResult<T>`
(`{ ok: true; data: T } | { ok: false; error: TrustFlowError }`) instead of throwing, so
callers get a typed, actionable `error.code` (e.g. `ASSEMBLY_ERROR`, `SIMULATION_ERROR`,
`FEE_BUMP_ERROR`, `SUBMISSION_ERROR`, `RETRY_EXHAUSTED`) without try/catch.

- `new TransactionPipeline(client: TrustFlowClient)`
- `.assemble(params)` — builds an unsigned transaction from a source account and operations
- `.simulate(tx)` — simulates a transaction against Soroban RPC without mutating it
- `.prepare(tx, options?)` — simulates and folds the footprint/auth/resource fee back onto
  the transaction, applying a configurable safety multiplier (`resourceFeeMultiplier`,
  default 1.1) on top of the RPC-reported `minResourceFee`; retries transient RPC failures
  with exponential backoff
- `.buildFeeBump(innerTx, { feeSource, baseFee? })` — wraps a transaction in a fee-bump
  envelope
- `.submit(tx, options?)` — broadcasts a signed transaction and polls for confirmation,
  retrying transient submission failures with exponential backoff
- `.run(params)` — convenience method chaining assemble → prepare → sign → submit; when
  submission fails for a fee-related reason (`TRY_AGAIN_LATER`, insufficient fee) and
  `submit.feeBump` is configured, automatically builds, signs, and resubmits a fee-bump
  transaction before giving up

```typescript
import { TransactionPipeline, TrustFlowClient } from '@trustflow/sdk';

const client = new TrustFlowClient({ contractId, network: 'TESTNET' });
const pipeline = new TransactionPipeline(client);

const result = await pipeline.run({
  sourceAccount: sender.publicKey(),
  operations: [contract.call('release', ...args)],
  signers: [sender],
  submit: { feeBump: { feeSource: sponsor } },
});

if (!result.ok) {
  console.error(result.error.code, result.error.message);
} else {
  console.log('confirmed:', result.data.hash, 'feeBumped:', result.data.feeBumped);
}
```

## Error Handling (`TrustFlowError` & `TrustFlowErrorCode`)

The SDK throws or returns `TrustFlowError` instances across operations (client instantiation, escrow operations, contract simulation, multi-sig operations, and wallet connections). Both `TrustFlowError` and its `TrustFlowErrorCode` type union are exported from the package root:

```typescript
import { TrustFlowClient, TrustFlowError, type TrustFlowErrorCode } from '@trustflow/sdk';

try {
  const client = new TrustFlowClient({ contractId: '' });
} catch (error) {
  if (error instanceof TrustFlowError) {
    console.error(`TrustFlow error [${error.code}]: ${error.message}`);
    if (error.code === 'INVALID_CONFIG') {
      // handle configuration error
    }
  }
}
```

### Error Codes (`TrustFlowErrorCode`)

| Error Code | Description |
|---|---|
| `CONNECTION_ERROR` | Network/RPC connection failure |
| `CONTRACT_ERROR` | Contract invocation error or contract failure |
| `VALIDATION_ERROR` | Input or schema validation failure |
| `UNAUTHORIZED` | Unauthorized action or missing wallet permissions |
| `NOT_FOUND` | Requested entity, escrow, or resource not found |
| `SIMULATION_ERROR` | Soroban transaction simulation failed |
| `SIGNING_ERROR` | Transaction signing failed |
| `INVALID_CONFIG` | Invalid or missing client configuration |
| `NOT_CONNECTED` | Operation attempted before client connected |
| `BALANCE_FETCH_ERROR` | Failed to query balance from Horizon/RPC |
| `MULTISIG_ERROR` | Generic multi-sig workflow error |
| `MULTISIG_THRESHOLD_NOT_MET` | Signatures collected is less than required threshold |
| `MULTISIG_ALREADY_SIGNED` | Signer has already signed this operation |
| `MULTISIG_EXPIRED` | Multi-sig operation expired |
| `MULTISIG_INVALID_SIGNER` | Address is not an authorized multi-sig signer |
| `MULTISIG_XDR_ERROR` | XDR serialization or decoding error during multi-sig operations |
| `ASSEMBLY_ERROR` | Soroban transaction assembly failure |
| `FEE_BUMP_ERROR` | Fee-bump transaction construction failure |
| `SUBMISSION_ERROR` | Transaction submission to RPC failed |
| `RETRY_EXHAUSTED` | Retry attempts exceeded for the operation |
| `NETWORK_ERROR` | Transport/network level error |
| `AUTH_ERROR` | Authentication challenge or verification failure |
| `TIMEOUT` | Operation timed out |

### Static Factory Methods

- `TrustFlowError.wrap(error: unknown, code?: TrustFlowErrorCode)`
- `TrustFlowError.notFound(resource: string)`
- `TrustFlowError.unauthorized(action: string)`
- `TrustFlowError.validation(field: string, message: string)`
- `TrustFlowError.multiSigThresholdNotMet(collected: number, required: number)`
- `TrustFlowError.multiSigExpired(operationId: string)`
- `TrustFlowError.multiSigInvalidSigner(address: string)`
- `TrustFlowError.multiSigXdrError(detail: string)`
- `TrustFlowError.assemblyFailed(detail: string, cause?: unknown)`
- `TrustFlowError.simulationFailed(detail: string, cause?: unknown)`
- `TrustFlowError.feeBumpFailed(detail: string, cause?: unknown)`
- `TrustFlowError.submissionFailed(detail: string, cause?: unknown)`
- `TrustFlowError.retryExhausted(stage: string, attempts: number, cause?: unknown)`
