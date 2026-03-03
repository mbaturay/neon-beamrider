import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";
import type { EnemyType } from "../core/types.ts";
import type { Theme, RGB } from "../themes/themeTypes.ts";

// ─── Internal renderer MaterialSet ───────────────────────────
// 8 materials needed by meshFactory / EntityPool / effects.

export interface MaterialSet {
  lane: StandardMaterial;
  player: StandardMaterial;
  bullet: StandardMaterial;
  enemyRunner: StandardMaterial;
  enemyDrifter: StandardMaterial;
  enemyCharger: StandardMaterial;
  tube: StandardMaterial;
  killRing: StandardMaterial;
  gate: StandardMaterial;
}

// ─── Bridge: Theme → MaterialSet ─────────────────────────────

function toColor3(c: RGB): Color3 {
  return new Color3(c.r, c.g, c.b);
}

/**
 * Create the full internal MaterialSet from a Theme.
 * Maps the theme's 5 materials → the renderer's 8 slots,
 * plus derives tube and killRing materials from the palette.
 */
export function createMaterialSetFromTheme(
  theme: Theme,
  scene: Scene,
): MaterialSet {
  const tm = theme.createMaterials(scene);
  const bg = theme.palette.background;

  // Tube: derived from background color, semi-transparent, inside-visible
  const tube = new StandardMaterial("mat_tube", scene);
  tube.diffuseColor = Color3.Black();
  tube.specularColor = Color3.Black();
  tube.emissiveColor = toColor3({ r: bg.r + 0.02, g: bg.g + 0.03, b: bg.b + 0.05 });
  tube.backFaceCulling = false;
  tube.alpha = 0.3;

  // Kill ring: bright white emissive
  const killRing = new StandardMaterial("mat_killRing", scene);
  killRing.diffuseColor = Color3.Black();
  killRing.specularColor = Color3.Black();
  killRing.emissiveColor = new Color3(1, 1, 1);

  // Gate: uses the theme's pickups palette slot
  const p = theme.palette.pickups;
  const gate = new StandardMaterial("mat_gate", scene);
  gate.diffuseColor = Color3.Black();
  gate.specularColor = Color3.Black();
  gate.emissiveColor = new Color3(p.r, p.g, p.b);

  return {
    lane: tm.laneMat,
    player: tm.playerMat,
    bullet: tm.bulletMat,
    enemyRunner: tm.enemyMatA,  // Runner → enemyA
    enemyDrifter: tm.enemyMatB, // Drifter → enemyB
    enemyCharger: tm.enemyMatA, // Charger → enemyA (shares with Runner)
    tube,
    killRing,
    gate,
  };
}

/**
 * Dispose all materials in a MaterialSet.
 * Safe to call even if some materials are shared (Babylon handles it).
 */
export function disposeMaterialSet(materials: MaterialSet): void {
  const disposed = new Set<StandardMaterial>();
  for (const mat of Object.values(materials)) {
    if (!disposed.has(mat)) {
      mat.dispose();
      disposed.add(mat);
    }
  }
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
