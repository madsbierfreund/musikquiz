let ctx: AudioContext | null = null;

export function audio() {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function tuba() {
  const c = audio(), t0 = c.currentTime + 0.02;
  const G2 = 98, D3 = 146.8, B2 = 123.5, G3 = 196;
  const seq: [number, number][] = [[G2,.2],[D3,.13],[D3,.13],[B2,.2],[D3,.13],[D3,.13],[G2,.16],[G3,.6]];
  let t = t0;
  const out = c.createGain(); out.gain.value = 0.55; out.connect(c.destination);
  for (const [f, d] of seq) {
    const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.97, t);
    o.frequency.linearRampToValueAtTime(f, t + 0.04);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(350, t);
    lp.frequency.linearRampToValueAtTime(1100, t + 0.05);
    lp.frequency.linearRampToValueAtTime(500, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.03);
    g.gain.setValueAtTime(0.9, t + d * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(lp); lp.connect(g); g.connect(out);
    o.start(t); o.stop(t + d + 0.02);
    t += d + 0.03;
  }
}

function cowbell(c: AudioContext, t: number, out: AudioNode) {
  const bp = c.createBiquadFilter(), g = c.createGain();
  bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 3;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(1, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  bp.connect(g); g.connect(out);
  for (const f of [587, 845]) {
    const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f;
    o.connect(bp); o.start(t); o.stop(t + 0.52);
  }
}

function yodel(c: AudioContext, t: number, out: AudioNode) {
  const notes: [number, number][] = [[440,.14],[659,.14],[554,.14],[880,.3],[659,.12],[740,.12],[880,.45]];
  const o = c.createOscillator(), g = c.createGain(), vib = c.createOscillator(), vg = c.createGain();
  o.type = 'triangle'; vib.frequency.value = 6; vg.gain.value = 7;
  vib.connect(vg); vg.connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  let tt = t;
  for (const [f, d] of notes) {
    o.frequency.setValueAtTime(o.frequency.value, tt);
    o.frequency.exponentialRampToValueAtTime(f, tt + 0.035);
    g.gain.exponentialRampToValueAtTime(0.5, tt + 0.03);
    g.gain.setValueAtTime(0.5, tt + d - 0.04);
    g.gain.exponentialRampToValueAtTime(0.12, tt + d);
    tt += d;
  }
  g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.15);
  o.connect(g); g.connect(out);
  o.start(t); vib.start(t); o.stop(tt + 0.2); vib.stop(tt + 0.2);
}

export function bellYodel() {
  const c = audio(), t = c.currentTime + 0.02;
  const out = c.createGain(); out.gain.value = 0.5; out.connect(c.destination);
  cowbell(c, t, out);
  cowbell(c, t + 0.22, out);
  yodel(c, t + 0.6, out);
}

export function playTeam(team: 'blaa' | 'roed') {
  (team === 'blaa' ? tuba : bellYodel)();
}
