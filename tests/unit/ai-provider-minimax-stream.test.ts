/**
 * Unit tests for executeWithMiniMaxStream — the streaming variant of the
 * MiniMax chat provider used by /api/chat?stream=1.
 *
 * Strategy: stub global.fetch with a fake Response whose body is a custom
 * ReadableStream we control. We feed the parser specific byte sequences
 * (including partial / split event boundaries) so we can exercise the
 * chunk-boundary edge cases that are very hard to reproduce against a
 * real upstream API.
 *
 * What we cover:
 *   - happy path: a few deltas + [DONE] produces prefix and deltas in order
 *   - splits a single SSE event across two TCP-like chunks
 *   - skips malformed JSON lines without crashing
 *   - [DONE] sentinel ends the generator cleanly
 *   - throws when API key is missing
 *   - throws when response status is not OK
 *   - AbortSignal cuts the upstream read mid-stream
 *   - finish_reason is captured
 *   - prior conversation history is preserved
 *   - Authorization + Accept headers are sent correctly
 */

// IMPORTANT: this MUST be the first import. It polyfills TextEncoder /
// TextDecoder / ReadableStream on globalThis BEFORE the SUT module loads,
// because ts-jest hoists ESM imports above top-level code. If the SUT
// loads before the polyfills, `new TextDecoder('utf-8')` throws inside
// the generator because jest's jsdom env hides those globals.
import '../setup-polyfills';

import { executeWithMiniMaxStream } from '@/lib/ai-provider-minimax';

// Sanity check at module load time: confirm the polyfills took effect.
// If they didn't, fail fast with a clear message.
if (typeof (globalThis as any).TextDecoder !== 'function') {
  throw new Error('Test setup error: TextDecoder not polyfilled before SUT loaded');
}

// Test helpers ---------------------------------------------------------------

interface ChunkSpec {
  /** Bytes pushed into the stream at this tick. */
  bytes: Uint8Array;
}

/**
 * Build a fake fetch Response backed by a controllable byte stream.
 *
 * We always return a plain shim with the surface our SUT touches
 * (response.body + response.ok + response.status + response.text()).
 * We never construct the global Response because jest's jsdom env
 * exposes a non-constructible stub (typeof === 'function' but `new`
 * throws "R is not a constructor").
 *
 * We hand-roll `getReader()` instead of letting the polyfill provide
 * one because jest's jsdom ReadableStream polyfill returns
 * `{done: false, value: undefined}` repeatedly instead of queued
 * chunks — see the comment in the helper below.
 *
 * Accepts an array of either Uint8Array (raw bytes) or ChunkSpec
 * objects so tests can pass either `sseBlock()` directly or
 * `{bytes: chunk.slice(0, mid)}` style objects.
 */
function makeStreamingResponse(events: Array<Uint8Array | ChunkSpec>): any {
  // Note: we deliberately don't use `instanceof Uint8Array` here. The
  // polyfilled Uint8Array (from jest's jsdom env) is a different
  // constructor than the Node one we used to encode the chunks, so
  // `chunk instanceof Uint8Array` returns false and the helper would
  // treat them as ChunkSpec objects. ArrayBuffer.isView covers both
  // Uint8Array flavors.
  const chunks = events.map((e) =>
    ArrayBuffer.isView(e) ? (e as Uint8Array) : (e as ChunkSpec).bytes
  );
  let released = false;
  let i = 0;
  const reader = {
    async read(): Promise<{ done: boolean; value?: Uint8Array }> {
      if (released) return { done: true };
      if (i >= chunks.length) return { done: true };
      const v = chunks[i++];
      return { done: false, value: v };
    },
    releaseLock() {
      released = true;
    },
  };
  const body = {
    getReader() { return reader; },
  };
  return {
    ok: true,
    status: 200,
    body,
    async text() { return ''; },
  };
}

/** SSE event block as the server would emit it (no leading newline). */
function sseBlock(dataPayload: object | string): Uint8Array {
  const text = typeof dataPayload === 'string'
    ? dataPayload
    : JSON.stringify(dataPayload);
  return new TextEncoder().encode(`data: ${text}\n\n`);
}

function doneSentinel(): Uint8Array {
  return new TextEncoder().encode('data: [DONE]\n\n');
}

/** Concatenate several Uint8Arrays into one (for partial-chunk tests). */
function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((s, c) => s + c.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

/**
 * Load executeWithMiniMaxStream with a fresh module-evaluation context so
 * the env-var capture at the top of the SUT sees the values we set just
 * before requiring it. (Without this, the SUT uses whatever env values
 * existed when jest first loaded it.)
 */
async function withFreshSUT<T>(
  envOverrides: Record<string, string>,
  fn: (sut: typeof import('@/lib/ai-provider-minimax').executeWithMiniMaxStream) => Promise<T>
): Promise<T> {
  let sut: typeof import('@/lib/ai-provider-minimax').executeWithMiniMaxStream;
  jest.isolateModules(() => {
    for (const [k, v] of Object.entries(envOverrides)) {
      process.env[k] = v;
    }
    ({ executeWithMiniMaxStream: sut } = require('@/lib/ai-provider-minimax'));
  });
  return fn(sut);
}

// Tests ----------------------------------------------------------------------

describe('executeWithMiniMaxStream', () => {
  test('happy path: yields deltas, accumulates prefix, ends on [DONE]', async () => {
    process.env.MINIMAX_API_KEY = 'k';
    process.env.MINIMAX_BASE_URL = 'https://x.test/v1';
    const { executeWithMiniMaxStream: sut } = require('@/lib/ai-provider-minimax');
    (global.fetch as any) = jest.fn().mockResolvedValueOnce(makeStreamingResponse([
      sseBlock({ choices: [{ delta: { content: 'Hello' } }] }),
      sseBlock({ choices: [{ delta: { content: ', world' } }] }),
      doneSentinel(),
    ]));
    const out: any[] = [];
    for await (const chunk of sut([{ role: 'user', content: 'hi' }], {})) {
      out.push(chunk);
    }
    expect(out).toHaveLength(2);
    expect(out[0].delta).toBe('Hello');
    expect(out[0].prefix).toBe('Hello');
    expect(out[1].delta).toBe(', world');
    expect(out[1].prefix).toBe('Hello, world');
  });

  test('handles a single event split across two chunks', async () => {
    await withFreshSUT(
      { MINIMAX_API_KEY: 'k', MINIMAX_BASE_URL: 'https://x.test/v1' },
      async (sut) => {
        const full = sseBlock({ choices: [{ delta: { content: 'split' } }] });
        const mid = Math.floor(full.byteLength / 2);
        const response = makeStreamingResponse([
          { bytes: full.slice(0, mid) },
          { bytes: full.slice(mid) },
          doneSentinel(),
        ]);
        (global.fetch as any) = jest.fn().mockResolvedValueOnce(response);

        const out: any[] = [];
        for await (const chunk of sut([{ role: 'user', content: 'x' }], {})) {
          out.push(chunk);
        }
        expect(out).toHaveLength(1);
        expect(out[0].delta).toBe('split');
        expect(out[0].prefix).toBe('split');
      }
    );
  });

  test('multiple events in a single chunk are all parsed', async () => {
    await withFreshSUT(
      { MINIMAX_API_KEY: 'k', MINIMAX_BASE_URL: 'https://x.test/v1' },
      async (sut) => {
        const combined = concat([
          sseBlock({ choices: [{ delta: { content: 'a' } }] }),
          sseBlock({ choices: [{ delta: { content: 'b' } }] }),
          sseBlock({ choices: [{ delta: { content: 'c' } }] }),
          doneSentinel(),
        ]);
        (global.fetch as any) = jest.fn().mockResolvedValueOnce(makeStreamingResponse([{ bytes: combined }]));

        const out: any[] = [];
        for await (const chunk of sut([{ role: 'user', content: 'x' }], {})) {
          out.push(chunk);
        }
        expect(out.map((c) => c.delta)).toEqual(['a', 'b', 'c']);
        expect(out[out.length - 1].prefix).toBe('abc');
      }
    );
  });

  test('skips malformed JSON lines without crashing the stream', async () => {
    await withFreshSUT(
      { MINIMAX_API_KEY: 'k', MINIMAX_BASE_URL: 'https://x.test/v1' },
      async (sut) => {
        const response = makeStreamingResponse([
          new TextEncoder().encode('data: not-json\n\n'),
          sseBlock({ choices: [{ delta: { content: 'good' } }] }),
          doneSentinel(),
        ]);
        (global.fetch as any) = jest.fn().mockResolvedValueOnce(response);

        const out: any[] = [];
        for await (const chunk of sut([{ role: 'user', content: 'x' }], {})) {
          out.push(chunk);
        }
        expect(out).toHaveLength(1);
        expect(out[0].delta).toBe('good');
      }
    );
  });

  test('[DONE] sentinel ends the generator immediately', async () => {
    await withFreshSUT(
      { MINIMAX_API_KEY: 'k', MINIMAX_BASE_URL: 'https://x.test/v1' },
      async (sut) => {
        const response = makeStreamingResponse([
          sseBlock({ choices: [{ delta: { content: 'before' } }] }),
          doneSentinel(),
          sseBlock({ choices: [{ delta: { content: 'after' } }] }),
        ]);
        (global.fetch as any) = jest.fn().mockResolvedValueOnce(response);

        const out: any[] = [];
        for await (const chunk of sut([{ role: 'user', content: 'x' }], {})) {
          out.push(chunk);
        }
        expect(out).toHaveLength(1);
        expect(out[0].delta).toBe('before');
      }
    );
  });

  test('captures finish_reason from the upstream chunk', async () => {
    await withFreshSUT(
      { MINIMAX_API_KEY: 'k', MINIMAX_BASE_URL: 'https://x.test/v1' },
      async (sut) => {
        const response = makeStreamingResponse([
          sseBlock({ choices: [{ delta: { content: 'a' } }] }),
          sseBlock({ choices: [{ delta: { content: 'b' }, finish_reason: 'stop' }] }),
          doneSentinel(),
        ]);
        (global.fetch as any) = jest.fn().mockResolvedValueOnce(response);

        const out: any[] = [];
        for await (const chunk of sut([{ role: 'user', content: 'x' }], {})) {
          out.push(chunk);
        }
        expect(out[out.length - 1].finishReason).toBe('stop');
      }
    );
  });

  test('emits a final chunk when upstream sends a finish_reason-only marker', async () => {
    await withFreshSUT(
      { MINIMAX_API_KEY: 'k', MINIMAX_BASE_URL: 'https://x.test/v1' },
      async (sut) => {
        const response = makeStreamingResponse([
          sseBlock({ choices: [{ delta: { content: 'answer' } }] }),
          // No delta, just finish_reason — upstream uses this pattern to
          // signal a clean stop without emitting any extra content.
          sseBlock({ choices: [{ delta: {}, finish_reason: 'length' }] }),
          doneSentinel(),
        ]);
        (global.fetch as any) = jest.fn().mockResolvedValueOnce(response);

        const out: any[] = [];
        for await (const chunk of sut([{ role: 'user', content: 'x' }], {})) {
          out.push(chunk);
        }
        expect(out).toHaveLength(2);
        expect(out[1].finishReason).toBe('length');
        expect(out[1].prefix).toBe('answer');
      }
    );
  });

  test('throws when API key is missing', async () => {
    let isolatedExec: typeof import('@/lib/ai-provider-minimax').executeWithMiniMaxStream;
    jest.isolateModules(() => {
      process.env.MINIMAX_API_KEY = '';
      process.env.MINIMAX_BASE_URL = 'https://x.test/v1';
      ({ executeWithMiniMaxStream: isolatedExec } = require('@/lib/ai-provider-minimax'));
    });
    const iter = isolatedExec([{ role: 'user', content: 'x' }], {});
    await expect(iter.next()).rejects.toThrow(/not configured/i);
  });

  test('throws when upstream returns non-OK status', async () => {
    await withFreshSUT(
      { MINIMAX_API_KEY: 'k', MINIMAX_BASE_URL: 'https://x.test/v1' },
      async (sut) => {
        (global.fetch as any) = jest.fn().mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
          body: null,
        });
        const iter = sut([{ role: 'user', content: 'x' }], {});
        await expect(iter.next()).rejects.toThrow(/stream error 500/);
      }
    );
  });

  test('aborts the upstream fetch when AbortSignal fires', async () => {
    await withFreshSUT(
      { MINIMAX_API_KEY: 'k', MINIMAX_BASE_URL: 'https://x.test/v1' },
      async (sut) => {
        const fetchSpy = jest.fn().mockImplementation((_url, init: any) => {
          // Honor the AbortSignal immediately so the SUT sees a cancellation.
          return new Promise((resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const e: any = new Error('aborted');
              e.name = 'AbortError';
              reject(e);
            });
          });
        });
        (global.fetch as any) = fetchSpy;

        const controller = new AbortController();
        const iter = sut([{ role: 'user', content: 'x' }], { signal: controller.signal });
        // Abort after the call begins (microtask boundary).
        Promise.resolve().then(() => controller.abort());

        await expect(iter.next()).rejects.toBeDefined();
      }
    );
  });

  test('preserves prior conversation history in the request body', async () => {
    await withFreshSUT(
      { MINIMAX_API_KEY: 'k', MINIMAX_BASE_URL: 'https://x.test/v1' },
      async (sut) => {
        const fetchSpy = jest.fn().mockResolvedValueOnce(makeStreamingResponse([doneSentinel()]));
        (global.fetch as any) = fetchSpy;

        const messages = [
          { role: 'system' as const, content: 'You are concise.' },
          { role: 'user' as const, content: 'first' },
          { role: 'assistant' as const, content: 'reply-1' },
          { role: 'user' as const, content: 'second' },
        ];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _chunk of sut(messages, {})) { /* noop */ }

        const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
        expect(body.messages).toHaveLength(4);
        expect(body.messages[0].role).toBe('system');
        expect(body.messages[3].content).toBe('second');
        expect(body.stream).toBe(true);
      }
    );
  });

  test('sends stream: true in the request body', async () => {
    await withFreshSUT(
      { MINIMAX_API_KEY: 'k', MINIMAX_BASE_URL: 'https://x.test/v1' },
      async (sut) => {
        const fetchSpy = jest.fn().mockResolvedValueOnce(makeStreamingResponse([doneSentinel()]));
        (global.fetch as any) = fetchSpy;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _chunk of sut([{ role: 'user', content: 'x' }], {})) { /* noop */ }

        const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
        expect(body.stream).toBe(true);
        expect(body.model).toBeTruthy();
      }
    );
  });

  test('passes Authorization + Accept headers on the streaming request', async () => {
    await withFreshSUT(
      { MINIMAX_API_KEY: 'stream-iso-key', MINIMAX_BASE_URL: 'https://x.test/v1' },
      async (sut) => {
        const fetchSpy = jest.fn().mockResolvedValueOnce(makeStreamingResponse([doneSentinel()]));
        (global.fetch as any) = fetchSpy;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _chunk of sut([{ role: 'user', content: 'x' }], {})) { /* noop */ }

        const init = fetchSpy.mock.calls[0][1];
        expect(init.headers.Authorization).toBe('Bearer stream-iso-key');
        expect(init.headers.Accept).toContain('text/event-stream');
      }
    );
  });
});
