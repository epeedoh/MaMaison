import assert from 'node:assert/strict';
import test from 'node:test';
import { startDemoViewer } from '../frontend/MaMaison.Web/public/viewer-3d/demo-access.mjs';

for (const config of [null, {}, { demo3dEnabled: false }, { demo3dEnabled: 'true' }]) {
  test(`viewer stays unloaded for ${JSON.stringify(config)}`, async () => {
    let loaded = false;
    let notice;
    await startDemoViewer({ fetchConfig: async () => config, loadViewer: async () => { loaded = true; }, showUnavailable: (...args) => { notice = args; } });
    assert.equal(loaded, false);
    assert.match(notice[0], /désactivée/);
    assert.equal(notice[1], false);
  });
}

test('enabled demo loads only after configuration arrives', async () => {
  const order = [];
  await startDemoViewer({ fetchConfig: async () => { order.push('config'); return { demo3dEnabled: true }; }, loadViewer: async () => { order.push('viewer'); }, showUnavailable: () => assert.fail('unexpected fallback') });
  assert.deepEqual(order, ['config', 'viewer']);
});

test('configuration/network/JSON failure does not download 3D', async () => {
  let notice;
  await startDemoViewer({ fetchConfig: async () => { throw new Error('offline'); }, loadViewer: async () => assert.fail('3D must stay unloaded'), showUnavailable: (...args) => { notice = args; } });
  assert.match(notice[0], /temporairement indisponible/);
  assert.equal(notice[1], true);
});

test('WebGL or asset failure offers retry', async () => {
  let notice;
  await startDemoViewer({ fetchConfig: async () => ({ demo3dEnabled: true }), loadViewer: async () => { throw new Error('WebGL unavailable'); }, showUnavailable: (...args) => { notice = args; } });
  assert.match(notice[0], /accélération graphique/);
  assert.equal(notice[1], true);
});
