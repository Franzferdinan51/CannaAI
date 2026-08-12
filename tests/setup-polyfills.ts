/**
 * Test-environment polyfills.
 *
 * jest's jsdom env shadow Node's TextEncoder / TextDecoder / ReadableStream
 * globals, but the SUT (executeWithMiniMaxStream) relies on them being
 * present at module-load time. ts-jest hoists ESM imports above top-level
 * code, so we have to do the polyfills as side effects of a separate
 * module that is imported BEFORE the SUT.
 *
 * Importing this module is a no-op aside from the polyfills.
 */

import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from 'node:util';
import { ReadableStream as NodeReadableStream } from 'node:stream/web';

const g = globalThis as any;
g.TextEncoder = NodeTextEncoder;
g.TextDecoder = NodeTextDecoder;
g.ReadableStream = NodeReadableStream;
