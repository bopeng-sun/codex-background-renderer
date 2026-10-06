import test from 'node:test';
import assert from 'node:assert/strict';
import {configuredProxies, launchEnvironment} from '../windows/proxy.mjs';

test('reuses enabled Windows proxy for HTTPS and keeps local connections direct', () => {
  const env = launchEnvironment({enabled: true, server: '127.0.0.1:9674'}, {PATH: 'existing'});
  assert.equal(env.HTTPS_PROXY, 'http://127.0.0.1:9674/');
  assert.equal(env.HTTP_PROXY, env.HTTPS_PROXY);
  assert.equal(env.NODE_USE_ENV_PROXY, '1');
  assert.equal(env.NO_PROXY, 'localhost,127.0.0.1,::1');
  assert.equal(env.PATH, 'existing');
});

test('respects explicit environment proxy and user exclusions', () => {
  const existing = {HTTPS_PROXY: 'http://127.0.0.1:8001', NO_PROXY: 'custom.local', NODE_USE_ENV_PROXY: '0'};
  const env = launchEnvironment({enabled: true, server: '127.0.0.1:9674'}, existing);
  assert.equal(env.HTTPS_PROXY, existing.HTTPS_PROXY);
  assert.equal(env.NO_PROXY, existing.NO_PROXY);
  assert.equal(env.NODE_USE_ENV_PROXY, '0');
  assert.deepEqual(existing, {HTTPS_PROXY: 'http://127.0.0.1:8001', NO_PROXY: 'custom.local', NODE_USE_ENV_PROXY: '0'});
});

test('supports per-protocol Windows settings and lowercase explicit environment', () => {
  assert.deepEqual(configuredProxies({enabled: true, server: 'http=127.0.0.1:8000;https=127.0.0.1:8001'}),
    {http: 'http://127.0.0.1:8000/', https: 'http://127.0.0.1:8001/'});
  const env = launchEnvironment({enabled: true, server: '127.0.0.1:9674'}, {https_proxy: 'http://127.0.0.1:8002'});
  assert.equal(env.https_proxy, 'http://127.0.0.1:8002');
  assert.equal(env.HTTPS_PROXY, undefined);
});

test('does not invent a proxy or enable unsupported proxy schemes', () => {
  assert.deepEqual(launchEnvironment({enabled: false, server: '127.0.0.1:9674'}, {PATH: 'existing'}), {PATH: 'existing'});
  for (const server of ['file:///config', 'socks5://127.0.0.1:1080', 'http://user:password@proxy.local:8080', 'http://proxy.local/path']) {
    assert.deepEqual(launchEnvironment({enabled: true, server}, {}), {});
  }
});
