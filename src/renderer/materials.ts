import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";
import type { EnemyType } from "../core/types.ts";
import {
  COLOR_LANE,
  COLOR_PLAYER,
  COLOR_BULLET,
  COLOR_ENEMY_RUNNER,
  COLOR_ENEMY_DRIFTER,
  COLOR_ENEMY_CHARGER,
  COLOR_TUBE,
  COLOR_KILL_RING,
} from "./constants.ts";

// ─── Helpers ─────────────────────────────────────────────────

interface RGB {
  r: number;
  g: number;
  b: number;
}

function toColor3(c: RGB): Color3 {
  return new Color3(c.r, c.g, c.b);
}

function createEmissiveMaterial(
  name: string,
  color: RGB,
  scene: Scene,
  opts?: {
    fresnel?: boolean;
    backFaceCulling?: boolean;
    alpha?: number;
  },
): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  mat.emissiveColor = toColor3(color);
  mat.backFaceCulling = opts?.backFaceCulling ?? true;

  if (opts?.alpha !== undefined) {
    mat.alpha = opts.alpha;
  }

  if (opts?.fresnel) {
    mat.emissiveFresnelParameters = new FresnelParameters();
    mat.emissiveFresnelParameters.bias = 0.6;
    mat.emissiveFresnelParameters.power = 2;
    mat.emissiveFresnelParameters.leftColor = toColor3(color);
    mat.emissiveFresnelParameters.rightColor = Color3.Black();
  }

  return mat;
}

// ─── Material set ────────────────────────────────────────────

export interface MaterialSet {
  lane: StandardMaterial;
  player: StandardMaterial;
  bullet: StandardMaterial;
  enemyRunner: StandardMaterial;
  enemyDrifter: StandardMaterial;
  enemyCharger: StandardMaterial;
  tube: StandardMaterial;
  killRing: StandardMaterial;
}

export function createMaterials(scene: Scene): MaterialSet {
  return {
    lane: createEmissiveMaterial("mat_lane", COLOR_LANE, scene),
    player: createEmissiveMaterial("mat_player", COLOR_PLAYER, scene, {
      fresnel: true,
    }),
    bullet: createEmissiveMaterial("mat_bullet", COLOR_BULLET, scene),
    enemyRunner: createEmissiveMaterial(
      "mat_enemy_runner",
      COLOR_ENEMY_RUNNER,
      scene,
      { fresnel: true },
    ),
    enemyDrifter: createEmissiveMaterial(
      "mat_enemy_drifter",
      COLOR_ENEMY_DRIFTER,
      scene,
      { fresnel: true },
    ),
    enemyCharger: createEmissiveMaterial(
      "mat_enemy_charger",
      COLOR_ENEMY_CHARGER,
      scene,
      { fresnel: true },
    ),
    tube: createEmissiveMaterial("mat_tube", COLOR_TUBE, scene, {
      backFaceCulling: false,
      alpha: 0.3,
    }),
    killRing: createEmissiveMaterial("mat_kill_ring", COLOR_KILL_RING, scene),
  };
}

export function getEnemyMaterial(
  materials: MaterialSet,
  enemyType: EnemyType,
): StandardMaterial {
  switch (enemyType) {
    case "Runner":
      return materials.enemyRunner;
    case "Drifter":
      return materials.enemyDrifter;
    case "Charger":
      return materials.enemyCharger;
  }
}
