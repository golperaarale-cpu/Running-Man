(() => {
'use strict';
const LANES = [-2.4, 0, 2.4], TILE = 36, TILES = 7;
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
const FOG = 0xe9a15a;
scene.background = new THREE.Color(FOG);
scene.fog = new THREE.Fog(FOG, 25, TILE * (TILES - 1));
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 300);
scene.add(new THREE.HemisphereLight(0xffd9a0, 0x2c3b1f, 0.85));
const sun = new THREE.DirectionalLight(0xffc27a, 1.6);
sun.position.set(-14, 22, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 30, bottom: -30, near: 1, far: 70 });
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(16, 48), new THREE.MeshBasicMaterial({ color: 0xfff1c4, fog: false }));
sunDisc.position.set(-30, 26, -190);
scene.add(sunDisc);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 0.8 ? 74 : 62;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- shared materials / geometry ----------
const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9, flatShading: true }, o));
const M = {
  stone: mat(0x8a7f6c), stoneDark: mat(0x5d5546), path: mat(0x7a6e5a, { flatShading: false }),
  moss: mat(0x5f8a3e), bark: mat(0x4a3322),
  leaf: [mat(0x2f6b2c), mat(0x3f8a34), mat(0x1f5a3a), mat(0x5a9a3a)],
  wood: mat(0x6b4425), gold: mat(0xf0b840, { metalness: 0.9, roughness: 0.25, flatShading: false, emissive: 0x6a4200 }),
  skin: mat(0xd9a074), cloth: mat(0xb23a2a), pants: mat(0x2c3b52), beast: mat(0x15101a),
  eye: new THREE.MeshBasicMaterial({ color: 0xff3010 }), glow: new THREE.MeshBasicMaterial({ color: 0xffe6a0 })
};
function jitterGeo(g, amt) {
  const p = g.attributes.position, seen = {};
  for (let i = 0; i < p.count; i++) {
    const k = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3);
    if (!seen[k]) seen[k] = [rnd(-amt, amt), rnd(-amt, amt), rnd(-amt, amt)];
    p.setXYZ(i, p.getX(i) + seen[k][0], p.getY(i) + seen[k][1], p.getZ(i) + seen[k][2]);
  }
  g.computeVertexNormals(); return g;
}
const G = {
  trunk: new THREE.CylinderGeometry(0.28, 0.5, 1, 7),
  blobs: [0, 1, 2].map(() => jitterGeo(new THREE.IcosahedronGeometry(1, 1).toNonIndexed(), 0.18)),
  rocks: [0, 1, 2].map(() => jitterGeo(new THREE.DodecahedronGeometry(1, 0).toNonIndexed(), 0.25)),
  box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 14), sph: new THREE.SphereGeometry(1, 16, 12),
  cone: new THREE.ConeGeometry(1, 1, 8), coin: new THREE.CylinderGeometry(0.42, 0.42, 0.1, 20)
};
function mesh(g, m, shadow = true) { const o = new THREE.Mesh(g, m); o.castShadow = shadow; o.receiveShadow = true; return o; }

// ---------- scenery ----------
function makeTree(h = rnd(5, 9)) {
  const t = new THREE.Group();
  const tr = mesh(G.trunk, M.bark); tr.scale.set(1, h, 1); tr.position.y = h / 2; t.add(tr);
  const lm = pick(M.leaf);
  for (let i = 0; i < 4; i++) {
    const b = mesh(pick(G.blobs), lm), s = rnd(1.5, 2.6) * (1 - i * 0.12);
    b.scale.set(s, s * 0.85, s);
    b.position.set(rnd(-0.9, 0.9), h + i * 0.7 - 0.2, rnd(-0.9, 0.9));
    b.rotation.y = rnd(0, 6); t.add(b);
  }
  if (Math.random() < 0.5) { // hanging vines
    for (let i = 0; i < 3; i++) { const v = mesh(G.box, M.moss, false); v.scale.set(0.06, rnd(1.5, 3), 0.06); v.position.set(rnd(-1.2, 1.2), h - 1.2, rnd(-1.2, 1.2)); t.add(v); }
  }
  return t;
}
function makeRock() { const r = mesh(pick(G.rocks), pick([M.stone, M.stoneDark])); const s = rnd(0.5, 1.6); r.scale.set(s * 1.3, s, s); r.position.y = s * 0.4; r.rotation.y = rnd(0, 6); return r; }
function makePillar(h = rnd(4, 8)) {
  const p = new THREE.Group();
  const c = mesh(G.box, M.stone); c.scale.set(1.2, h, 1.2); c.position.y = h / 2; p.add(c);
  for (const y of [0.3, h]) { const cap = mesh(G.box, M.stoneDark); cap.scale.set(1.6, 0.35, 1.6); cap.position.y = y; p.add(cap); }
  const m = mesh(G.box, M.moss, false); m.scale.set(1.25, 0.8, 1.25); m.position.y = rnd(0.5, h * 0.5); p.add(m);
  return p;
}
function makeTile() {
  const t = new THREE.Group();
  const path = mesh(G.box, M.path); path.scale.set(8.6, 1, TILE); path.position.y = -0.5; path.castShadow = false; t.add(path);
  for (let i = 0; i < 6; i++) { // carved slabs
    const s = mesh(G.box, M.stone, false); s.scale.set(rnd(1.6, 2.4), 0.06, rnd(2, 3.5));
    s.position.set(pick(LANES), 0.02, rnd(-TILE / 2, TILE / 2)); t.add(s);
  }
  for (const side of [-1, 1]) {
    const gnd = mesh(G.box, M.moss); gnd.scale.set(60, 1, TILE); gnd.position.set(side * 34.3, -0.55, 0); gnd.castShadow = false; t.add(gnd);
    const edge = mesh(G.box, M.stoneDark); edge.scale.set(0.8, 0.5, TILE); edge.position.set(side * 4.6, 0.05, 0); t.add(edge);
    for (let i = 0; i < 7; i++) { const tr = makeTree(); tr.position.set(side * rnd(7, 30), -0.3, rnd(-TILE / 2, TILE / 2)); tr.rotation.y = rnd(0, 6); t.add(tr); }
    for (let i = 0; i < 4; i++) { const r = makeRock(); r.position.x = side * rnd(5.6, 20); r.position.z = rnd(-TILE / 2, TILE / 2); t.add(r); }
    for (let i = 0; i < 2; i++) { const p = makePillar(); p.position.set(side * rnd(6, 12), 0, rnd(-TILE / 2, TILE / 2)); p.rotation.y = rnd(-0.2, 0.2); t.add(p); }
    for (let i = 0; i < 5; i++) { const f = mesh(G.sph, M.moss, false); f.scale.set(rnd(.3, .7), rnd(.3, .6), rnd(.3, .7)); f.position.set(side * rnd(5.2, 9), 0.2, rnd(-TILE / 2, TILE / 2)); t.add(f); }
  }
  if (Math.random() < 0.6) { // ruined arch over the path
    const z = rnd(-12, 12);
    for (const s of [-1, 1]) { const p = makePillar(7); p.position.set(s * 5.3, 0, z); t.add(p); }
    const b = mesh(G.box, M.stone); b.scale.set(12.4, 1.2, 1.6); b.position.set(0, 7.4, z); t.add(b);
    const b2 = mesh(G.box, M.moss, false); b2.scale.set(5, 0.3, 1.7); b2.position.set(rnd(-2, 2), 8.05, z); t.add(b2);
  }
  return t;
}
const tiles = [];
for (let i = 0; i < TILES; i++) { const t = makeTile(); t.position.z = -i * TILE + TILE; scene.add(t); tiles.push(t); }

// fireflies
const FF = 160, ffGeo = new THREE.BufferGeometry(), ffPos = new Float32Array(FF * 3);
for (let i = 0; i < FF; i++) ffPos.set([rnd(-14, 14), rnd(0.5, 7), rnd(-90, 8)], i * 3);
ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
const ff = new THREE.Points(ffGeo, new THREE.PointsMaterial({ color: 0xfff0a0, size: 0.16, transparent: true, opacity: 0.9, depthWrite: false }));
scene.add(ff);

// ---------- characters ----------
function limb(w, h, m, x, y) { const g = new THREE.Group(); const l = mesh(G.box, m); l.scale.set(w, h, w); l.position.y = -h / 2; g.add(l); g.position.set(x, y, 0); return g; }
const player = new THREE.Group(), pBody = new THREE.Group(); player.add(pBody);
const torso = mesh(G.box, M.cloth); torso.scale.set(0.7, 0.85, 0.4); torso.position.y = 1.35; pBody.add(torso);
const head = mesh(G.sph, M.skin); head.scale.setScalar(0.27); head.position.y = 1.98; pBody.add(head);
const hair = mesh(G.sph, M.bark); hair.scale.set(0.29, 0.22, 0.3); hair.position.set(0, 2.06, 0.04); pBody.add(hair);
const pack = mesh(G.box, M.wood); pack.scale.set(0.5, 0.6, 0.25); pack.position.set(0, 1.4, 0.3); pBody.add(pack);
const armL = limb(0.2, 0.75, M.skin, -0.46, 1.7), armR = limb(0.2, 0.75, M.skin, 0.46, 1.7);
const legL = limb(0.26, 0.95, M.pants, -0.18, 0.95), legR = limb(0.26, 0.95, M.pants, 0.18, 0.95);
pBody.add(armL, armR, legL, legR); scene.add(player);

const beast = new THREE.Group(), bBody = new THREE.Group(); beast.add(bBody);
const bTorso = mesh(G.sph, M.beast); bTorso.scale.set(1.3, 1.1, 1.8); bTorso.position.y = 1.5; bBody.add(bTorso);
const bHead = mesh(G.sph, M.beast); bHead.scale.set(0.8, 0.75, 0.9); bHead.position.set(0, 2.2, -1.5); bBody.add(bHead);
for (const s of [-1, 1]) {
  const e = new THREE.Mesh(G.sph, M.eye); e.scale.setScalar(0.12); e.position.set(s * 0.32, 2.3, -2.3); bBody.add(e);
  const h = mesh(G.cone, M.stone); h.scale.set(0.16, 0.8, 0.16); h.position.set(s * 0.5, 2.9, -1.4); h.rotation.z = -s * 0.4; bBody.add(h);
}
const bl = [[-0.7, -0.8], [0.7, -0.8], [-0.7, 0.9], [0.7, 0.9]].map(([x, z]) => { const l = limb(0.4, 1.3, M.beast, x, 1.3); l.position.z = z; bBody.add(l); return l; });
const eyeLight = new THREE.PointLight(0xff3010, 2.5, 9); eyeLight.position.set(0, 2.3, -3); bBody.add(eyeLight);
scene.add(beast);

// ---------- obstacles / coins ----------
const obstacles = [], coins = [];
function spawnObstacle(lane, z, type) {
  const o = new THREE.Group(); o.userData = { type, lane };
  if (type === 'block') {
    const b = mesh(G.box, M.stone); b.scale.set(1.9, 1.8, 1.4); b.position.y = 0.9; o.add(b);
    const m = mesh(G.box, M.moss, false); m.scale.set(1.95, 0.25, 1.45); m.position.y = 1.85; o.add(m);
    const r = mesh(G.box, M.stoneDark); r.scale.set(0.6, 0.6, 1.45); r.position.set(0.3, 1.1, 0); o.add(r);
  } else if (type === 'log') {
    const l = mesh(G.cyl, M.wood); l.scale.set(0.5, 2.1, 0.5); l.rotation.z = Math.PI / 2; l.position.y = 0.5; o.add(l);
    for (const s of [-1, 1]) { const c = mesh(G.cyl, M.stoneDark); c.scale.set(0.12, 0.2, 0.12); c.position.set(s * 1.05, 0.5, 0); c.rotation.z = Math.PI / 2; o.add(c); }
  } else {
    for (const s of [-1, 1]) { const p = mesh(G.box, M.stone); p.scale.set(0.35, 2.6, 0.5); p.position.set(s * 1.0, 1.3, 0); o.add(p); }
    const b = mesh(G.box, M.stoneDark); b.scale.set(2.5, 0.55, 0.7); b.position.y = 2.1; o.add(b);
    const g = new THREE.Mesh(G.sph, M.glow); g.scale.setScalar(0.1); g.position.set(0, 1.7, 0.4); o.add(g);
  }
  o.position.set(LANES[lane], 0, z); scene.add(o); obstacles.push(o);
}
function spawnCoin(lane, z) {
  const c = mesh(G.coin, M.gold); c.rotation.x = Math.PI / 2; c.userData = { lane };
  c.position.set(LANES[lane], 1.1, z); scene.add(c); coins.push(c);
}
let nextSpawnZ = -50;
function spawnRow() {
  const r = Math.random(), lane = (Math.random() * 3) | 0;
  if (r < 0.28) { // coin line
    for (let i = 0; i < 6; i++) spawnCoin(lane, nextSpawnZ - i * 1.8);
  } else if (r < 0.52) { // single obstacle
    spawnObstacle(lane, nextSpawnZ, pick(['block', 'log', 'arch']));
    if (Math.random() < 0.6) for (let i = 0; i < 3; i++) spawnCoin((lane + 1) % 3, nextSpawnZ - i * 1.8 + 2);
  } else if (r < 0.8) { // two blocked lanes, one free
    const free = lane; 
    for (let l = 0; l < 3; l++) if (l !== free) spawnObstacle(l, nextSpawnZ, Math.random() < 0.5 ? 'block' : 'log');
    for (let i = 0; i < 4; i++) spawnCoin(free, nextSpawnZ - i * 1.8 + 3);
  } else { // jump coin arc over log
    spawnObstacle(lane, nextSpawnZ, 'log');
    for (let i = -2; i <= 2; i++) { spawnCoin(lane, nextSpawnZ + i * 1.2); coins[coins.length - 1].position.y = 1.1 + (2.2 - Math.abs(i)) * 0.5; }
  }
  nextSpawnZ -= rnd(16, 24);
}

// ---------- audio (tiny synth, no files) ----------
let ac; const beep = (f, d, t = 'square', v = 0.05, f2) => {
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain();
    o.type = t; o.frequency.setValueAtTime(f, ac.currentTime); if (f2) o.frequency.exponentialRampToValueAtTime(f2, ac.currentTime + d);
    g.gain.setValueAtTime(v, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d);
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + d); } catch (e) {}
};

// ---------- state ----------
const S = { run: false, speed: 0, dist: 0, coins: 0, lane: 1, x: 0, y: 0, vy: 0, slide: 0, stumble: 0, beastGap: 8, shake: 0, t: 0 };
const BASE = 15, MAXS = 34;
function reset() {
  Object.assign(S, { run: true, speed: BASE, dist: 0, coins: 0, lane: 1, x: 0, y: 0, vy: 0, slide: 0, stumble: 0, beastGap: 8, shake: 0 });
  [...obstacles, ...coins].forEach(o => scene.remove(o)); obstacles.length = coins.length = 0;
  nextSpawnZ = -50; while (nextSpawnZ > -150) spawnRow();
  $('stumble').hidden = true; $('hud').hidden = false; $('menu').hidden = $('over').hidden = true;
}
const best = () => { try { return +localStorage.getItem('ruinsBest') || 0; } catch (e) { return 0; } };
$('best').textContent = best() ? 'Best ' + best() + ' m' : '';
function gameOver() {
  S.run = false; beep(120, 0.6, 'sawtooth', 0.12, 40);
  const d = Math.floor(S.dist), nb = d > best();
  if (nb) try { localStorage.setItem('ruinsBest', d); } catch (e) {}
  $('fscore').textContent = d; $('fcoins').textContent = S.coins; $('newbest').hidden = !nb;
  $('hud').hidden = true; $('stumble').hidden = true; $('over').hidden = false;
}
function hit() {
  if (S.stumble > 0) return gameOver();
  S.stumble = 5; S.beastGap = 3.2; S.shake = 0.5; S.speed *= 0.8;
  $('stumble').hidden = false; beep(90, 0.3, 'sawtooth', 0.12, 50);
}

// ---------- input ----------
const act = {
  left() { if (S.run && S.lane > 0) { S.lane--; beep(420, 0.08, 'triangle', 0.04, 300); } },
  right() { if (S.run && S.lane < 2) { S.lane++; beep(300, 0.08, 'triangle', 0.04, 420); } },
  jump() { if (S.run && S.y <= 0.001) { S.vy = 11.5; S.slide = 0; beep(300, 0.2, 'triangle', 0.05, 700); } },
  slide() { if (S.run) { S.slide = 0.7; if (S.y > 0) S.vy = -16; } }
};
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') act.left(); else if (k === 'arrowright' || k === 'd') act.right();
  else if (k === 'arrowup' || k === 'w' || k === ' ') act.jump(); else if (k === 'arrowdown' || k === 's') act.slide();
});
let tx, ty;
addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', e => {
  if (tx == null) return; const dx = e.touches[0].clientX - tx, dy = e.touches[0].clientY - ty;
  if (Math.hypot(dx, dy) < 28) return;
  if (Math.abs(dx) > Math.abs(dy)) dx > 0 ? act.right() : act.left(); else dy < 0 ? act.jump() : act.slide();
  tx = null;
}, { passive: true });
addEventListener('touchend', () => { tx = null; });
$('play').onclick = $('again').onclick = reset;

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05); last = now; S.t += dt;
  const menu = !S.run && !$('menu').hidden;
  const v = S.run ? S.speed : (menu ? 8 : 0);

  if (S.run) {
    S.speed = Math.min(MAXS, S.speed + dt * 0.35); S.dist += S.speed * dt * 0.5;
    S.x += (LANES[S.lane] - S.x) * Math.min(1, dt * 14);
    S.vy -= 30 * dt; S.y += S.vy * dt; if (S.y <= 0) { S.y = 0; S.vy = 0; }
    if (S.slide > 0) S.slide -= dt;
    if (S.stumble > 0) { S.stumble -= dt; if (S.stumble <= 0) $('stumble').hidden = true; }
    S.beastGap += ((S.stumble > 0 ? 3.2 : 9) - S.beastGap) * dt * 0.6;
    S.shake = Math.max(0, S.shake - dt);
    $('score').textContent = Math.floor(S.dist); $('coins').textContent = S.coins;
  }

  // world scroll
  tiles.forEach(t => { t.position.z += v * dt; if (t.position.z > TILE * 1.5) t.position.z -= TILE * TILES; });
  const pos = ffGeo.attributes.position;
  for (let i = 0; i < FF; i++) { let z = pos.getZ(i) + v * dt; if (z > 10) z -= 100; pos.setZ(i, z); pos.setY(i, pos.getY(i) + Math.sin(S.t * 2 + i) * 0.004); }
  pos.needsUpdate = true;
  if (S.run) {
    obstacles.forEach(o => o.position.z += v * dt); coins.forEach(c => { c.position.z += v * dt; c.rotation.z += dt * 4; });
    nextSpawnZ += v * dt; while (nextSpawnZ > -150) spawnRow();
    for (const arr of [obstacles, coins]) for (let i = arr.length - 1; i >= 0; i--) if (arr[i].position.z > 12) { scene.remove(arr[i]); arr.splice(i, 1); }
    const sliding = S.slide > 0, py = S.y;
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i], u = o.userData;
      if (Math.abs(o.position.z) < 0.9 && Math.abs(o.position.x - S.x) < 1.0 && !u.hit) {
        const bad = u.type === 'block' ? py < 1.8 : u.type === 'log' ? py < 0.75 : !sliding;
        if (bad) { u.hit = true; hit(); }
      }
    }
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      if (Math.abs(c.position.z) < 1 && Math.abs(c.position.x - S.x) < 1 && Math.abs(c.position.y - (py + 1)) < 1.3) {
        scene.remove(c); coins.splice(i, 1); S.coins++; beep(900 + (S.coins % 5) * 60, 0.12, 'sine', 0.06);
      }
    }
  }

  // character animation
  const run = S.run ? S.t * (S.speed * 0.55) : S.t * 6, air = S.y > 0.05;
  player.position.set(S.x, S.y, 0);
  pBody.rotation.x = S.slide > 0 && !air ? -0.9 : 0.12; pBody.position.y = S.slide > 0 && !air ? -0.55 : 0;
  const sw = air ? 0.8 : Math.sin(run) * 0.9;
  legL.rotation.x = sw; legR.rotation.x = -sw; armL.rotation.x = -sw; armR.rotation.x = sw;
  if (S.run) player.rotation.z = (S.x - LANES[S.lane]) * 0.08;
  beast.position.set(S.x * 0.6, 0, S.beastGap);
  bBody.position.y = Math.abs(Math.sin(run * 0.8)) * 0.25; bl.forEach((l, i) => l.rotation.x = Math.sin(run * 0.8 + (i % 2 ? Math.PI : 0) + (i > 1 ? 1.5 : 0)) * 0.9);
  eyeLight.intensity = 2 + Math.sin(S.t * 8) * 0.6;

  // camera
  const sh = S.shake * 0.4;
  camera.position.set(S.x * 0.55 + rnd(-sh, sh), 4.4 + S.y * 0.3 + rnd(-sh, sh), 7.2);
  camera.lookAt(S.x * 0.35, 1.6, -8);
  sun.target.position.set(0, 0, -10); sun.position.set(-14, 22, 0);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
})();
