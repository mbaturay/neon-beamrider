import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { Theme, ThemePalette, ThemeMaterials, VfxFactory, RGB, QualityLevel } from "../themeTypes.ts";

// ─── Palette — bold flat colors ──────────────────────────────

const palette: ThemePalette = {
  background: { r: 0.08, g: 0.08, b: 0.1 },
  lanes: { r: 0.9, g: 0.9, b: 0.95 }, // near-white
  player: { r: 0.2, g: 0.5, b: 1 }, // bold blue
  enemyA: { r: 1, g: 0.15, b: 0.15 }, // bold red
  enemyB: { r: 0.1, g: 0.85, b: 0.3 }, // bold green
  bullet: { r: 1, g: 0.85, b: 0.1 }, // bold yellow
  pickups: { r: 1, g: 0.4, b: 0.8 },
};

// ─── Helpers ─────────────────────────────────────────────────

function toColor3(c: RGB): Color3 {
  return new Color3(c.r, c.g, c.b);
}

function flatMat(name: string, color: RGB, scene: Scene): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  mat.emissiveColor = toColor3(color);
  return mat;
}

// ─── Theme ───────────────────────────────────────────────────

export const chunkyTheme: Theme = {
  id: "chunky",
  name: "Chunky",
  palette,

  applyToScene(scene: Scene, _camera: Camera, _quality: QualityLevel): void {
    const bg = palette.background;
    scene.clearColor = new Color4(bg.r, bg.g, bg.b, 1);
    scene.fogMode = Scene.FOGMODE_EXP;
    scene.fogDensity = 0.006;
    scene.fogColor = toColor3(bg);
  },

  removeFromScene(_scene: Scene): void {
    // No post-processing to dispose
  },

  createMaterials(scene: Scene): ThemeMaterials {
    return {
      laneMat: flatMat("chunky_lane", palette.lanes, scene),
      playerMat: flatMat("chunky_player", palette.player, scene),
      enemyMatA: flatMat("chunky_enemyA", palette.enemyA, scene),
      enemyMatB: flatMat("chunky_enemyB", palette.enemyB, scene),
      bulletMat: flatMat("chunky_bullet", palette.bullet, scene),
    };
  },

  createVfxFactory(scene: Scene, _quality: QualityLevel): VfxFactory {
    const killMat = flatMat("chunky_vfx_kill", { r: 1, g: 1, b: 1 }, scene);
    const hitMat = flatMat("chunky_vfx_hit", palette.bullet, scene);

    return {
      spawnExplosion(position: Vector3, sc: Scene): void {
        // Chunky: expanding cube instead of torus
        const cube = MeshBuilder.CreateBox(
          `chunky_kill_${performance.now()}`,
          { size: 0.3 },
          sc,
        );
        cube.position.copyFrom(position);
        cube.material = killMat;
        cube.isPickable = false;

        const start = performance.now();
        const obs = sc.onBeforeRenderObservable.add(() => {
          const p = Math.min((performance.now() - start) / 300, 1);
          const s = 0.3 + p * 2.0;
          cube.scaling.setAll(s);
          cube.rotation.y += 0.1;
          if (cube.material) cube.material.alpha = 1 - p;
          if (p >= 1) {
            cube.dispose();
            sc.onBeforeRenderObservable.remove(obs);
          }
        });
      },

      spawnHit(position: Vector3, sc: Scene): void {
        const flash = MeshBuilder.CreateBox(
          `chunky_hit_${performance.now()}`,
          { size: 0.2 },
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

export default chunkyTheme;
