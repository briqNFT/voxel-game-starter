// Small helpers for briq assets in three.js. Nothing here is briq-specific
// magic — it is the handful of conventions every briq GLB follows, written
// down once so the game code can stay about the game.
//
//   - Units: 1 voxel = 1 unit. A character is ~25-35 units tall.
//   - Characters (rig_standard "briq-v1"): face +Z at rest, feet at y=0,
//     centered on the origin, and the animated GLB always carries these
//     clips by name: idle, walk, run, jump-start, jump-loop, jump-end,
//     combat-idle, attack, hit, death, interact, dance.
//   - Each clip carries `extras.briq`: `loop` (play once or loop) and, for
//     walk/run, `speed` — the travel rate in the character's own units per
//     second. Move at exactly that speed and the feet never slide.
//   - Props keep their MagicaVoxel origin (a corner), so `placeOnGround`
//     recenters them under the origin with their base at y=0.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();

export function loadGlb(url) {
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
}

/** Voxel art reads best flat-shaded with shadows on. */
export function prepareForScene(object) {
  object.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.material) node.material.flatShading = true;
    }
  });
  return object;
}

/** Center an object on x/z and drop its lowest point to y=0. */
export function placeOnGround(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;
  const group = new THREE.Group();
  group.add(object);
  return group;
}

/**
 * A briq-v1 character: one mixer, clips by name, crossfades, and the
 * per-clip speed/loop metadata read straight off the GLB.
 */
export class BriqCharacter {
  constructor(gltf) {
    this.object = prepareForScene(gltf.scene);
    this.mixer = new THREE.AnimationMixer(this.object);
    this.actions = new Map();
    this.meta = new Map();
    for (const clip of gltf.animations) {
      const briq = clip.userData?.briq ?? {};
      const action = this.mixer.clipAction(clip);
      if (briq.loop === false) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(clip.name, action);
      this.meta.set(clip.name, briq);
    }
    this.current = null;
    this.height = new THREE.Box3().setFromObject(this.object).max.y;
  }

  has(name) {
    return this.actions.has(name);
  }

  /** Travel speed baked into walk/run, in this character's own units per second. */
  speedOf(name, fallback = 0) {
    return this.meta.get(name)?.speed ?? fallback;
  }

  play(name, fade = 0.15) {
    const next = this.actions.get(name);
    if (!next || next === this.current) return next;
    next.reset().fadeIn(fade).play();
    this.current?.fadeOut(fade);
    this.current = next;
    return next;
  }

  /** Play a one-shot clip, then resolve when it ends. */
  playOnce(name, fade = 0.1) {
    return new Promise((resolve) => {
      const action = this.play(name, fade);
      if (!action) return resolve();
      const onFinished = (event) => {
        if (event.action !== action) return;
        this.mixer.removeEventListener("finished", onFinished);
        resolve();
      };
      this.mixer.addEventListener("finished", onFinished);
    });
  }

  update(dt) {
    this.mixer.update(dt);
  }
}
