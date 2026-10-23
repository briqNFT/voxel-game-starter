// Outpost Run — a briq voxel game starter.
//
// An orc collects energy cells around a small sci-fi outpost. Everything 3D
// is a free briq asset vendored into public/assets/ (see assets.json and
// CREDITS.md). The character is a briq-v1 rig, so swapping it for any other
// briq-v1 asset is a one-line change in assets.json: the clip names and
// movement speeds come from the file, not from this code.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { BriqCharacter, loadGlb, placeOnGround, prepareForScene } from "./briq.js";

const WORLD = 420; // half-size of the playable square, in voxel units
const CELL_COUNT = 10;
const COLLECT_RADIUS = 22;
const GRAVITY = -900;
const JUMP_VELOCITY = 320;

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);
scene.fog = new THREE.Fog(0x0b1020, 700, 1400);
// Voxel palettes often mark parts metallic; without an environment map,
// PBR metal renders black. A neutral room environment keeps artist intent.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.6;

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 3000);

// ---------------------------------------------------------------- lights
scene.add(new THREE.HemisphereLight(0x9fb4ff, 0x2a1f3a, 0.9));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
sun.position.set(300, 500, 200);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -600;
sun.shadow.camera.right = sun.shadow.camera.top = 600;
sun.shadow.camera.near = 50;
sun.shadow.camera.far = 1400;
sun.shadow.bias = -0.0005;
scene.add(sun);

// ---------------------------------------------------------------- ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD * 2.6, WORLD * 2.6),
  new THREE.MeshStandardMaterial({ color: 0x3a3650, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const grid = new THREE.GridHelper(WORLD * 2, 42, 0x5a5480, 0x4a4468);
grid.position.y = 0.2;
scene.add(grid);

// ---------------------------------------------------------------- HUD
const hud = {
  score: document.getElementById("score"),
  total: document.getElementById("total"),
  toast: document.getElementById("toast"),
};
let toastTimer = 0;
function toast(text, ms = 1600) {
  hud.toast.textContent = text;
  hud.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => hud.toast.classList.remove("show"), ms);
}

// ---------------------------------------------------------------- assets
async function loadAssets() {
  const manifest = await fetch("/assets.json").then((r) => r.json());
  const assetUrl = (entry) => `/assets/${entry.file}`;
  const [characterGltf, ...propGltfs] = await Promise.all([
    loadGlb(assetUrl(manifest.character)),
    ...manifest.props.map((p) => loadGlb(assetUrl(p))),
  ]);
  return { characterGltf, propGltfs };
}

main().catch((error) => {
  console.error(error);
  toast(`Failed to load assets: ${error.message}`, 10000);
});

async function main() {
  const { characterGltf, propGltfs } = await loadAssets();

  // Outpost layout: the first prop is the centerpiece, the rest ring it.
  const PROP_SLOTS = [
    { x: 0, z: -120, ry: 0 },
    { x: -220, z: 60, ry: Math.PI / 3 },
    { x: 230, z: 40, ry: -Math.PI / 4 },
    { x: -90, z: -330, ry: Math.PI * 0.8 },
  ];
  const obstacles = [];
  propGltfs.forEach((gltf, i) => {
    const slot = PROP_SLOTS[i % PROP_SLOTS.length];
    const prop = placeOnGround(prepareForScene(gltf.scene));
    prop.position.set(slot.x, 0, slot.z);
    prop.rotation.y = slot.ry;
    scene.add(prop);
    const box = new THREE.Box3().setFromObject(prop);
    obstacles.push({ center: box.getCenter(new THREE.Vector3()), radius: box.getSize(new THREE.Vector3()).length() * 0.3 });
  });

  const hero = new BriqCharacter(characterGltf);
  scene.add(hero.object);
  hero.object.position.set(0, 0, 60);
  hero.play("idle");

  const walkSpeed = hero.speedOf("walk", 10);
  const runSpeed = hero.speedOf("run", 40);

  // ---------------------------------------------------------------- cells
  const cellGeometry = new THREE.OctahedronGeometry(7, 0);
  const cellMaterial = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xff8a00, emissiveIntensity: 1.4, roughness: 0.3 });
  const cells = [];
  function randomCellPosition() {
    for (let attempt = 0; attempt < 50; attempt++) {
      const p = new THREE.Vector3((Math.random() * 2 - 1) * WORLD * 0.85, 12, (Math.random() * 2 - 1) * WORLD * 0.85);
      const clear = obstacles.every((o) => p.distanceTo(o.center) > o.radius + 20) && p.length() > 60;
      if (clear) return p;
    }
    return new THREE.Vector3(0, 12, WORLD * 0.5);
  }
  function spawnCell() {
    const cell = new THREE.Mesh(cellGeometry, cellMaterial);
    cell.position.copy(randomCellPosition());
    cell.castShadow = true;
    const light = new THREE.PointLight(0xffa033, 60, 80);
    cell.add(light);
    scene.add(cell);
    cells.push(cell);
  }
  for (let i = 0; i < CELL_COUNT; i++) spawnCell();
  hud.total.textContent = String(CELL_COUNT);

  let score = 0;

  // ---------------------------------------------------------------- input
  const keys = new Set();
  window.addEventListener("keydown", (e) => {
    keys.add(e.code);
    if (e.code === "Space") e.preventDefault();
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  const down = (...codes) => codes.some((c) => keys.has(c));

  // ---------------------------------------------------------------- loop
  const timer = new THREE.Timer();
  const move = new THREE.Vector3();
  const cameraGoal = new THREE.Vector3();
  const lookGoal = new THREE.Vector3();
  let verticalVelocity = 0;
  let airborne = false;
  let jumpPhase = null; // "start" | "loop" | "end"

  camera.position.set(0, 260, 380);

  function tick() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);

    // Direction in world space: camera looks down -Z, so W pushes toward -Z.
    move.set(0, 0, 0);
    if (down("KeyW", "ArrowUp")) move.z -= 1;
    if (down("KeyS", "ArrowDown")) move.z += 1;
    if (down("KeyA", "ArrowLeft")) move.x -= 1;
    if (down("KeyD", "ArrowRight")) move.x += 1;
    const moving = move.lengthSq() > 0;
    const running = down("ShiftLeft", "ShiftRight");

    // Jump: start → loop while airborne → end on landing, then back to gait.
    if (down("Space") && !airborne) {
      airborne = true;
      verticalVelocity = JUMP_VELOCITY;
      jumpPhase = "start";
      hero.playOnce("jump-start", 0.05).then(() => {
        if (airborne) {
          jumpPhase = "loop";
          hero.play("jump-loop", 0.05);
        }
      });
    }
    if (airborne) {
      verticalVelocity += GRAVITY * dt;
      hero.object.position.y = Math.max(0, hero.object.position.y + verticalVelocity * dt);
      if (hero.object.position.y === 0 && verticalVelocity < 0) {
        airborne = false;
        jumpPhase = "end";
        hero.playOnce("jump-end", 0.05).then(() => {
          jumpPhase = null;
        });
      }
    }

    if (moving) {
      move.normalize();
      // Characters face +Z at rest: yaw so the nose follows the input vector.
      hero.object.rotation.y = Math.atan2(move.x, move.z);
      const speed = running ? runSpeed : walkSpeed;
      hero.object.position.addScaledVector(move, speed * dt);
      hero.object.position.x = THREE.MathUtils.clamp(hero.object.position.x, -WORLD, WORLD);
      hero.object.position.z = THREE.MathUtils.clamp(hero.object.position.z, -WORLD, WORLD);
      if (!jumpPhase) hero.play(running ? "run" : "walk");
    } else if (!jumpPhase) {
      hero.play("idle");
    }

    // Keep the hero out of the props (cheap circle push-out).
    for (const o of obstacles) {
      const dx = hero.object.position.x - o.center.x;
      const dz = hero.object.position.z - o.center.z;
      const d = Math.hypot(dx, dz);
      if (d < o.radius && d > 0.001) {
        hero.object.position.x = o.center.x + (dx / d) * o.radius;
        hero.object.position.z = o.center.z + (dz / d) * o.radius;
      }
    }

    // Cells: bob, spin, collect.
    const t = timer.getElapsed();
    for (let i = cells.length - 1; i >= 0; i--) {
      const cell = cells[i];
      cell.rotation.y = t * 1.5;
      cell.position.y = 12 + Math.sin(t * 3 + i) * 3;
      if (cell.position.distanceTo(hero.object.position) < COLLECT_RADIUS) {
        scene.remove(cell);
        cells.splice(i, 1);
        score += 1;
        hud.score.textContent = String(score);
        if (score === CELL_COUNT) {
          toast("Outpost powered up! Press R to play again", 4000);
        } else {
          toast(`+1 energy cell`);
        }
      }
    }
    if (score === CELL_COUNT && down("KeyR")) {
      score = 0;
      hud.score.textContent = "0";
      for (let i = 0; i < CELL_COUNT; i++) spawnCell();
    }

    // Third-person camera: trail behind and above, look at the chest.
    cameraGoal.set(hero.object.position.x, hero.object.position.y + 150, hero.object.position.z + 260);
    camera.position.lerp(cameraGoal, 1 - Math.exp(-dt * 4));
    lookGoal.set(hero.object.position.x, hero.object.position.y + hero.height * 0.6, hero.object.position.z);
    camera.lookAt(lookGoal);

    hero.update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  toast("Collect the energy cells", 2200);
  tick();
}
