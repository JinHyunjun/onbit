import { mkdir, readdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const destination = new URL('../public/vision/', import.meta.url);
const wasm = new URL('../node_modules/@mediapipe/tasks-vision/wasm/', import.meta.url);
await mkdir(new URL('wasm/', destination), { recursive: true });
for (const name of await readdir(wasm)) {
  if (/\.(wasm|js)$/.test(name)) await copyFile(new URL(name, wasm), new URL(`wasm/${name}`, destination));
}
const model = new URL('face_detector.tflite', destination);
const expected = 'b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let cached;
try { cached = await readFile(model); } catch { /* Download on first build. */ }
if (!cached || hash(cached) !== expected) {
  const response = await fetch('https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite', { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > 1_000_000 || hash(bytes) !== expected) throw new Error('Model checksum mismatch');
  await writeFile(model, bytes);
}
console.log('Self-hosted face model and WASM assets prepared.');
