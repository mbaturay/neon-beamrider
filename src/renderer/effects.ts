import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import type { MaterialSet } from "./materials.ts";
import { mapLaneZToWorld } from "./mapping.ts";
import { KILL_RING_DURATION_MS, KILL_RING_MAX_SCALE } from "./constants.ts";

interface ActiveEffect {
  mesh: Mesh;
  startTime: number;
  durationMs: number;
  update: (mesh: Mesh, progress: number) => void;
}

/**
 * Short-lived visual effects triggered by game events.
 */
export class EffectsManager {
  private readonly scene: Scene;
  private readonly materials: MaterialSet;
  private readonly lanes: number;
  private readonly active: ActiveEffect[] = [];
  private nextId = 0;

  constructor(scene: Scene, materials: MaterialSet, lanes: number) {
    this.scene = scene;
    this.materials = materials;
    this.lanes = lanes;
  }

  /** Expanding ring at enemy kill position. */
  spawnKillRing(laneIndex: number, z: number): void {
    const pos = mapLaneZToWorld(laneIndex, z, this.lanes);
    const id = this.nextId++;

    const ring = MeshBuilder.CreateTorus(
      `killRing_${id}`,
      { diameter: 0.3, thickness: 0.06, tessellation: 16 },
      this.scene,
    );
    ring.position.copyFrom(pos);
    ring.material = this.materials.killRing;
    ring.isPickable = false;

    this.active.push({
      mesh: ring,
      startTime: performance.now(),
      durationMs: KILL_RING_DURATION_MS,
      update: (m, p) => {
        const s = 0.3 + p * KILL_RING_MAX_SCALE;
        m.scaling = new Vector3(s, s, s);
        if (m.material) m.material.alpha = 1 - p;
      },
    });
  }

  /** Brief muzzle flash at bullet spawn point. */
  spawnMuzzleFlash(laneIndex: number): void {
    const pos = mapLaneZToWorld(laneIndex, 1, this.lanes);
    const id = this.nextId++;

    const flash = MeshBuilder.CreateSphere(
      `muzzle_${id}`,
      { diameter: 0.3, segments: 4 },
      this.scene,
    );
    flash.position.copyFrom(pos);
    flash.material = this.materials.bullet;
    flash.isPickable = false;

    this.active.push({
      mesh: flash,
      startTime: performance.now(),
      durationMs: 100,
      update: (m, p) => {
        const s = 1 - p;
        m.scaling.setAll(s);
      },
    });
  }

  /** Update active effects; dispose expired ones. */
  tick(): void {
    const now = performance.now();
    let write = 0;

    for (let i = 0; i < this.active.length; i++) {
      const fx = this.active[i];
      const progress = Math.min(
        (now - fx.startTime) / fx.durationMs,
        1,
      );

      if (progress >= 1) {
        fx.mesh.dispose();
        continue;
      }

      fx.update(fx.mesh, progress);
      this.active[write] = fx;
      write++;
    }
    this.active.length = write;
  }

  /** Dispose all active effects. */
  disposeAll(): void {
    for (const fx of this.active) fx.mesh.dispose();
    this.active.length = 0;
  }
}
