import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { resolveApiBaseUrl } from '../src/lib/api/apiConfig.ts';

test('development API URL defaults to localhost only outside production', () => {
  assert.equal(resolveApiBaseUrl(undefined, false), 'http://localhost:8000/api');
  assert.throws(
    () => resolveApiBaseUrl(undefined, true),
    /VITE_API_BASE_URL is required/
  );
});

test('production API URL requires HTTPS and rejects localhost', () => {
  assert.equal(
    resolveApiBaseUrl('https://api.example.test/api/', true),
    'https://api.example.test/api'
  );
  assert.throws(
    () => resolveApiBaseUrl('http://api.example.test/api', true),
    /must use HTTPS/
  );
  assert.throws(
    () => resolveApiBaseUrl('https://localhost:8000/api', true),
    /cannot point to localhost/
  );
  assert.throws(
    () => resolveApiBaseUrl('https://127.0.0.2/api', true),
    /cannot point to localhost/
  );
  assert.throws(
    () => resolveApiBaseUrl('https://[::1]/api', true),
    /cannot point to localhost/
  );
});

test('API URL rejects credentials, queries, and invalid absolute URLs', () => {
  for (const value of [
    'not a URL',
    'https://user:password@api.example.test/api',
    'https://api.example.test/api?token=value',
    'https://api.example.test/api?',
    'ftp://api.example.test/api',
  ]) {
    assert.throws(() => resolveApiBaseUrl(value, false));
  }
});

test('Vercel rewrites each supported route without rewriting API or assets', async () => {
  const configUrl = new URL('../vercel.json', import.meta.url);
  const config = JSON.parse(await readFile(configUrl, 'utf8'));
  const routes = [
    '/dashboard',
    '/characters',
    '/world',
    '/memory',
    '/continuity',
    '/editor',
    '/assistant',
    '/relationships',
    '/qna',
  ];

  assert.deepEqual(
    config.rewrites.map(({ source, destination }) => ({ source, destination })),
    routes.map((route) => ({ source: route, destination: '/index.html' }))
  );
  assert.equal(config.outputDirectory, 'dist');
});
