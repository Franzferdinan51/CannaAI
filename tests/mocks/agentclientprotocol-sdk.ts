// The ACP SDK is ESM-only. Provider unit tests exercise detection and fallback
// behavior, not the wire protocol, so keep the ESM transport out of Jest's
// CommonJS runtime while preserving the production import contract.
export const PROTOCOL_VERSION = 1;

export function ndJsonStream(): never {
  throw new Error('ACP transport is unavailable in the Jest unit-test runtime');
}

export class ClientSideConnection {
  constructor() {
    throw new Error('ACP transport is unavailable in the Jest unit-test runtime');
  }
}
