import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedAsset, listenerMatches, trustedInstallation} from '../windows/launcher.mjs';

test('Windows launcher accepts only a valid OpenAI signature', () => {
  assert.equal(trustedInstallation({signatureStatus: 'Valid', signer: 'CN="OpenAI OpCo, LLC", O="OpenAI OpCo, LLC", L=San Francisco'}), true);
  assert.equal(trustedInstallation({signatureStatus: 'NotSigned', signer: 'O="OpenAI OpCo, LLC"'}), false);
  assert.equal(trustedInstallation({signatureStatus: 'Valid', signer: 'CN=OpenAI, O=Another Company'}), false);
  assert.equal(trustedInstallation({signatureStatus: 'Valid', signer: 'O=OpenAI Fake'}), false);
});

test('Listener belongs to the intended executable and user, and only loopback', () => {
  const record = {address: '127.0.0.1', sameUser: true, executable: 'C:\\Apps\\ChatGPT.exe'};
  assert.equal(listenerMatches([record], 'c:\\apps\\chatgpt.exe'), true);
  for (const change of [{address: '0.0.0.0'}, {address: '::'}, {sameUser: false}, {executable: 'C:\\Other\\ChatGPT.exe'}]) {
    assert.equal(listenerMatches([{...record, ...change}], record.executable), false);
  }
  assert.equal(listenerMatches([], record.executable), false);
  assert.equal(listenerMatches([record, {...record, address: '0.0.0.0'}], record.executable), false);
});

test('Preview serves animation resources, excludes scripts, repository and arbitrary files', () => {
  assert.equal(allowedAsset('/'), 'index.html');
  assert.equal(allowedAsset('/assets/artwork.jpg'), 'assets/artwork.jpg');
  assert.equal(allowedAsset('/.build/extension-preview/'), '.build/extension-preview/index.html');
  for (const pathname of ['/.git/config', '/windows/platform.ps1', '/../README.md', '/%2e%2e/README.md', '/assets/../README.md']) {
    assert.equal(allowedAsset(pathname), null);
  }
});
