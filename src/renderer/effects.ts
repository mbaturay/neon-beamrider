import type { Scene } from "@babylonjs/core/scene";
import type { VfxFactory } from "../themes/themeTypes.ts";
import { mapLaneZToWorld } from "./mapping.ts";

/**
 * Delegates VFX to the active theme's VfxFactory.
 * The theme owns the mesh creation and animation;
 * this manager just provides the game→world position mapping.
 */
export class EffectsManager {
  private readonly scene: Scene;
  private vfxFactory: VfxFactory;
  private readonly lanes: number;

  constructor(scene: Scene, vfxFactory: VfxFactory, lanes: number) {
    this.scene = scene;
    this.vfxFactory = vfxFactory;
    this.lanes = lanes;
  }

  /** Spawn explosion at enemy kill position. */
  spawnKillRing(laneIndex: number, z: number): void {
    const pos = mapLaneZToWorld(laneIndex, z, this.lanes);
    this.vfxFactory.spawnExplosion(pos, this.scene);
  }

  /** Spawn muzzle flash at bullet origin. */
  spawnMuzzleFlash(laneIndex: number): void {
    const pos = mapLaneZToWorld(laneIndex, 1, this.lanes);
    this.vfxFactory.spawnHit(pos, this.scene);
  }

  /** Replace the VFX factory (on theme switch). */
  setVfxFactory(factory: VfxFactory): void {
    this.vfxFactory = factory;
  }
}
