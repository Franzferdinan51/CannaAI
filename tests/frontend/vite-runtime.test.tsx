import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { resolveWebSocketUrl } from '../../NewUI/cannaai-pro/src/lib/websocket-url';
import { SafeMarkdown } from '../../NewUI/cannaai-pro/src/components/chat/markdown';
import {
  MAX_ATTACHMENT_SIZE,
  createFileAttachment,
  getAttachmentValidationError,
} from '../../NewUI/cannaai-pro/src/components/chat/attachments';

describe('Vite frontend runtime contracts', () => {
  it('resolves relative WebSocket paths against the active page protocol', () => {
    expect(resolveWebSocketUrl('/api/chat/ws', 'https://app.example/chat')).toBe(
      'wss://app.example/api/chat/ws'
    );
    expect(resolveWebSocketUrl('/api/chat/ws', 'http://localhost:5174')).toBe(
      'ws://localhost:5174/api/chat/ws'
    );
  });

  it('preserves explicit WebSocket URLs while converting HTTP schemes', () => {
    expect(resolveWebSocketUrl('http://localhost:3000/ws')).toBe('ws://localhost:3000/ws');
    expect(resolveWebSocketUrl('https://api.example/ws')).toBe('wss://api.example/ws');
  });

  it('adds an API token without overwriting an explicit token query value', () => {
    expect(resolveWebSocketUrl('/api/chat/ws', 'https://app.example', 'secret')).toBe(
      'wss://app.example/api/chat/ws?token=secret'
    );
    expect(resolveWebSocketUrl('/api/chat/ws?token=provided', 'https://app.example', 'secret')).toBe(
      'wss://app.example/api/chat/ws?token=provided'
    );
  });

  it('renders markdown as React content without interpreting HTML', () => {
    const { container } = render(
      React.createElement(SafeMarkdown, { content: '**safe** <img src=x onerror=alert(1)>\n`code`' })
    );

    expect(screen.getByText('safe')).toBeInTheDocument();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });

  it('rejects unsupported or oversized attachment payloads', () => {
    expect(getAttachmentValidationError(new File(['x'], 'notes.exe', { type: 'application/x-msdownload' }))).toBe(
      'This file type is not supported.'
    );
    expect(
      getAttachmentValidationError(
        new File([new Uint8Array(MAX_ATTACHMENT_SIZE + 1)], 'large.txt', { type: 'text/plain' })
      )
    ).toBe('Files must be 10 MB or smaller.');
  });

  it('includes the real data URL in an attachment payload', () => {
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    const attachment = createFileAttachment(file, 'data:text/plain;base64,aGVsbG8=');

    expect(attachment).toMatchObject({
      name: 'notes.txt',
      type: 'text/plain',
      size: 5,
      data: 'data:text/plain;base64,aGVsbG8=',
    });
  });

  it('uses safe local Vite defaults and only precaches existing stylesheet paths', () => {
    const viteConfig = fs.readFileSync(
      path.join(process.cwd(), 'NewUI/cannaai-pro/vite.config.ts'),
      'utf8'
    );
    const serviceWorker = fs.readFileSync(
      path.join(process.cwd(), 'NewUI/cannaai-pro/public/sw.js'),
      'utf8'
    );

    expect(viteConfig).toContain("host: '127.0.0.1'");
    expect(viteConfig).not.toContain("allowedHosts: true");
    expect(serviceWorker).not.toContain("'/index.css'");
  });
});
