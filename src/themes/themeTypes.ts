import type { Scene } from "@babylonjs/core/scene";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";

// ─── ThemeId ─────────────────────────────────────────────────
// const-object + type-union (erasableSyntaxOnly forbids enum)

export const ThemeId = {
  Neon: "neon",
  Retro: "retro",
  Chunky: "chunky",
} as const;

export type ThemeId = (typeof ThemeId)[keyof typeof ThemeId];

// ─── QualityLevel ───────────────────────────────────────────

export const QualityLevel = {
  Low: "low",
  Medium: "medium",
  High: "high",
} as const;

export type QualityLevel = (typeof QualityLevel)[keyof typeof QualityLevel];

// ─── Palette ─────────────────────────────────────────────────

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ThemePalette {
  background: RGB;
  lanes: RGB;
  player: RGB;
  enemyA: RGB;
  enemyB: RGB;
  bullet: RGB;
  pickups: RGB;
}

// ─── Theme materials ─────────────────────────────────────────

export interface ThemeMaterials {
  laneMat: StandardMaterial;
  playerMat: StandardMaterial;
  enemyMatA: StandardMaterial;
  enemyMatB: StandardMaterial;
  bulletMat: StandardMaterial;
}

// ─── VFX factory ─────────────────────────────────────────────

export interface VfxFactory {
  spawnExplosion(position: Vector3, scene: Scene): void;
  spawnHit(position: Vector3, scene: Scene): void;
}

// ─── Theme interface ─────────────────────────────────────────

export interface Theme {
  readonly id: ThemeId;
  readonly name: string;
  readonly palette: ThemePalette;

  /** Set scene clearColor, fog, post-processing, etc. */
  applyToScene(scene: Scene, camera: Camera, quality: QualityLevel): void;

  /** Dispose post-processes and any scene-level resources this theme added. */
  removeFromScene(scene: Scene): void;

  /** Create the theme's materials (caller owns disposal). */
  createMaterials(scene: Scene): ThemeMaterials;

  /** Create VFX spawner functions using the theme's aesthetic. */
  createVfxFactory(scene: Scene, quality: QualityLevel): VfxFactory;
}
