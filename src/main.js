import * as THREE from "three";

const AUDIO_URL = "/conversation-clips.mp3";

// ---------- Three.js setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
if (window.innerWidth < window.innerHeight) {
  camera.position.z = 10;
} else {
  camera.position.z = 6;
}
camera.position.y = 1;
const canvas = document.getElementById("practice");
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = "0";
document.body.appendChild(renderer.domElement);

const geometry = new THREE.SphereGeometry(1, 64);

const circleA = new THREE.Mesh(
  geometry,
  new THREE.MeshBasicMaterial({ color: "green", wireframe: true }),
);
circleA.position.x = -1.75;
scene.add(circleA);

const circleB = new THREE.Mesh(
  geometry,
  new THREE.MeshBasicMaterial({ color: "green", wireframe: true }),
);
circleB.position.x = 1.75;
scene.add(circleB);

const circleC = new THREE.Mesh(
  geometry,
  new THREE.MeshBasicMaterial({ color: "green", wireframe: true }),
);
circleC.position.y = 2;
scene.add(circleC);

// ---------- Web Audio setup ----------
let audioCtx = null;
let analyser = null;
let freqData = null;
let started = false;

async function startAudio() {
  if (started) return;
  started = true;

  audioCtx = new AudioContext();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.8;
  freqData = new Uint8Array(analyser.frequencyBinCount);

  const response = await fetch(AUDIO_URL);
  const buffer = await audioCtx.decodeAudioData(await response.arrayBuffer());

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  source.start();
}

async function stopAudio() {
  audioCtx.suspend();
  started = false;
}

// Returns the average level (0..1) for a frequency range in Hz.
function getBandLevel(minHz, maxHz) {
  if (!analyser) return 0;
  const nyquist = audioCtx.sampleRate / 2;
  const start = Math.floor((minHz / nyquist) * freqData.length);
  const end = Math.min(
    freqData.length - 1,
    Math.ceil((maxHz / nyquist) * freqData.length),
  );
  let sum = 0;
  for (let i = start; i <= end; i++) sum += freqData[i];
  return sum / ((end - start + 1) * 255);
}

// Browsers block audio until the user interacts with the page.
const hint = document.createElement("div");
hint.textContent = "Mouse click/touch screen to stop and start audio";
Object.assign(hint.style, {
  position: "fixed",
  inset: "0",
  display: "grid",
  placeItems: "top",
  color: "#fff",
  font: "20px sans-serif",
  cursor: "pointer",
});
document.body.appendChild(hint);
window.addEventListener("pointerdown", () => {
  if (!started) {
    startAudio().catch(console.error);
  } else {
    stopAudio().catch(console.error);
  }
});

// ---------- Animation loop ----------
const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();

  if (analyser) analyser.getByteFrequencyData(freqData);

  const bass = getBandLevel(20, 250);
  const mids = getBandLevel(252, 1999);
  const treble = getBandLevel(2000, 8000);

  // Circle A: scale pulses with bass.
  const scaleA = 1 + bass * 1.5;
  circleA.scale.lerp(new THREE.Vector3(scaleA, scaleA, 1), 0.3);
  circleA.rotation.x = Math.sin(t * 2) * bass * 1.5;
  circleA.material.color.setHSL(0.35 - bass * 0.2, 0.8, 0.4 + bass * 0.3);

  // Circle B: bobs and brightens with treble.
  const scaleB = 1 + treble * 2;
  circleB.scale.lerp(new THREE.Vector3(scaleB, scaleB, 1), 0.3);
  circleB.rotation.x = Math.sin(t * 3) * treble * 2.5;
  circleB.material.color.setHSL(0.75 + treble * 0.2, 0.8, 0.4 + treble * 0.4);

  const scalec = 1 + mids * 2;
  circleC.scale.lerp(new THREE.Vector3(scalec, scalec, 1), 0.3);
  circleC.rotation.x = Math.sin(t * 3) * mids * 2.5;
  circleC.material.color.setHSL(0.55 + mids * 0.2, 0.8, 0.4 + mids * 0.4);

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// ---------- Resize ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
