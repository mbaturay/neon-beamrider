import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { Theme, ThemePalette, ThemeMaterials, VfxFactory, RGB } from "../themeTypes.ts";

// ─── Palette — warm CRT aesthetic ───────────────────────────

const palette: ThemePalette = {
  background: { r: 0.02, g: 0.04, b: 0.02 },
  lanes: { r: 0.9, g: 0.7, b: 0.1 }, // amber
  player: { r: 1, g: 0.6, b: 0.1 }, // warm orange
  enemyA: { r: 0.1, g: 0.9, b: 0.2 }, // green
  enemyB: { r: 0.9, g: 0.9, b: 0.1 }, // yellow
  bullet: { r: 1, g: 0.4, b: 0.1 }, // orange tracer
  pickups: { r: 0.1, g: 0.8, b: 0.8 },
};

// ─── Helpers ─────────────────────────────────────────────────

function toColor3(c: RGB): Color3 {
  return new Color3(c.r, c.g, c.b);
}

function emissiveMat(name: string, color: RGB, scene: Scene): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  mat.emissiveColor = toColor3(color);
  return mat;
}

// ─── Theme ───────────────────────────────────────────────────

export const retroTheme: Theme = {
  id: "retro",
  name: "Retro",
  palette,

  applyToScene(scene: Scene, _camera: Camera): void {
    const bg = palette.background;
    scene.clearColor = new Color4(bg.r, bg.g, bg.b, 1);
    scene.fogMode = Scene.FOGMODE_EXP;
    scene.fogDensity = 0.01;
    scene.fogColor = toColor3(bg);
  },

  removeFromScene(_scene: Scene): void {
    // No post-processing to dispose
  },

  createMaterials(scene: Scene): ThemeMaterials {
    return {
      laneMat: emissiveMat("retro_lane", palette.lanes, scene),
      playerMat: emissiveMat("retro_player", palette.player, scene),
      enemyMatA: emissiveMat("retro_enemyA", palette.enemyA, scene),
      enemyMatB: emissiveMat("retro_enemyB", palette.enemyB, scene),
      bulletMat: emissiveMat("retro_bullet", palette.bullet, scene),
    };
  },

  createVfxFactory(scene: Scene): VfxFactory {
    const killMat = emissiveMat("retro_vfx_kill", { r: 1, g: 0.8, b: 0 }, scene);
    const hitMat = emissiveMat("retro_vfx_hit", palette.bullet, scene);

    return {
      spawnExplosion(position: Vector3, sc: Scene): void {
        const ring = MeshBuilder.CreateTorus(
          `retro_kill_${performance.now()}`,
          { diameter: 0.3, thickness: 0.06, tessellation: 12 },
          sc,
        );
        ring.position.copyFrom(position);
        ring.material = killMat;
        ring.isPickable = false;

        const start = performance.now();
        const obs = sc.onBeforeRenderObservable.add(() => {
          const p = Math.min((performance.now() - start) / 300, 1);
          ring.scaling.setAll(0.3 + p * 2.0);
          if (ring.material) ring.material.alpha = 1 - p;
          if (p >= 1) {
            ring.dispose();
            sc.onBeforeRenderObservable.remove(obs);
          }
        });
      },

      spawnHit(position: Vector3, sc: Scene): void {
        const flash = MeshBuilder.CreateSphere(
          `retro_hit_${performance.now()}`,
          { diameter: 0.25, segments: 4 },
          sc,
        );
        flash.position.copyFrom(position);
        flash.material = hitMat;
        flash.isPickable = false;

        const start = performance.now();
        const obs = sc.onBeforeRenderObservable.add(() => {
          const p = Math.min((performance.now() - start) / 100, 1);
          flash.scaling.setAll(1 - p);
          if (p >= 1) {
            flash.dispose();
            sc.onBeforeRenderObservable.remove(obs);
          }
        });
      },
    };
  },
};

export default retroTheme;
