/**
 * Generates the app's small UI sounds as 16-bit mono WAV files (no third-party audio).
 * Run: node scripts/generate-sounds.js
 */
const fs = require('fs');
const path = require('path');

const RATE = 22050;

function note(freq, start, dur, { vol = 0.5, type = 'sine', decay = 6 } = {}) {
  return { freq, start, dur, vol, type, decay };
}

function render(notes, totalSec) {
  const n = Math.ceil(totalSec * RATE);
  const buf = new Float32Array(n);
  for (const nt of notes) {
    const s0 = Math.floor(nt.start * RATE);
    const len = Math.floor(nt.dur * RATE);
    for (let i = 0; i < len && s0 + i < n; i++) {
      const t = i / RATE;
      const attack = Math.min(1, i / (0.008 * RATE));
      const env = attack * Math.exp(-nt.decay * t);
      const ph = 2 * Math.PI * nt.freq * t;
      let v = Math.sin(ph);
      if (nt.type === 'bell')
        v = 0.6 * Math.sin(ph) + 0.3 * Math.sin(2 * ph) + 0.1 * Math.sin(3.01 * ph);
      if (nt.type === 'soft') v = 0.8 * Math.sin(ph) + 0.2 * Math.sin(2 * ph);
      buf[s0 + i] += v * env * nt.vol;
    }
  }
  // soft limiter
  for (let i = 0; i < n; i++) buf[i] = Math.tanh(buf[i] * 1.2) * 0.85;
  return buf;
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.max(-1, Math.min(1, s)) * 32767, i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const C5 = 523.25,
  E5 = 659.25,
  G5 = 783.99,
  C6 = 1046.5,
  E6 = 1318.5,
  G6 = 1568,
  A5 = 880,
  D6 = 1174.7;

const sounds = {
  tap: render([note(880, 0, 0.12, { vol: 0.35, type: 'soft', decay: 30 })], 0.14),
  success: render(
    [
      note(G5, 0, 0.35, { type: 'bell', decay: 8 }),
      note(C6, 0.09, 0.5, { type: 'bell', decay: 6 }),
    ],
    0.65,
  ),
  celebrate: render(
    [
      note(C5, 0, 0.3, { type: 'bell' }),
      note(E5, 0.09, 0.3, { type: 'bell' }),
      note(G5, 0.18, 0.3, { type: 'bell' }),
      note(C6, 0.27, 0.7, { type: 'bell', decay: 4 }),
      note(E6, 0.4, 0.4, { vol: 0.2, type: 'bell', decay: 7 }),
      note(G6, 0.5, 0.4, { vol: 0.15, type: 'bell', decay: 7 }),
    ],
    1.1,
  ),
  coin: render(
    [
      note(A5 * 1.5, 0, 0.08, { vol: 0.4, decay: 20 }),
      note(D6 * 1.5, 0.07, 0.4, { vol: 0.4, decay: 8 }),
    ],
    0.5,
  ),
  badge: render(
    [
      note(G5, 0, 0.18, { type: 'bell' }),
      note(G5, 0.15, 0.18, { type: 'bell' }),
      note(C6, 0.3, 0.9, { type: 'bell', decay: 3 }),
      note(E6, 0.3, 0.9, { vol: 0.25, type: 'bell', decay: 3 }),
    ],
    1.3,
  ),
  gentle: render(
    [
      note(E5, 0, 0.4, { vol: 0.35, type: 'soft', decay: 7 }),
      note(C5, 0.15, 0.5, { vol: 0.3, type: 'soft', decay: 6 }),
    ],
    0.7,
  ),
};

const out = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(out, { recursive: true });
for (const [name, samples] of Object.entries(sounds)) {
  fs.writeFileSync(path.join(out, `${name}.wav`), wav(samples));
  console.warn(`wrote ${name}.wav`);
}
