import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { Theme, ThemePalette, ThemeMaterials, VfxFactory, RGB, QualityLevel } from "../themeTypes.ts";

// ─── Palette ─────────────────────────────────────────────────

const palette: ThemePalette = {
  background: { r: 0, g: 0, b: 0 },
  lanes: { r: 0, g: 1, b: 1 },
  player: { r: 0.2, g: 0.8, b: 1 },
  enemyA: { r: 1, g: 0.2, b: 0.2 },
  enemyB: { r: 0.8, g: 0.2, b: 1 },
  bullet: { r: 1, g: 1, b: 0.4 },
  pickups: { r: 0.2, g: 1, b: 0.4 },
};

// ─── Helpers ─────────────────────────────────────────────────

function toColor3(c: RGB): Color3 {
  return new Color3(c.r, c.g, c.b);
}

function emissiveMat(
  name: string,
  color: RGB,
  scene: Scene,
  fresnel = false,
): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  mat.emissiveColor = toColor3(color);
  if (fresnel) {
    mat.emissiveFresnelParameters = new FresnelParameters();
    mat.emissiveFresnelParameters.bias = 0.6;
    mat.emissiveFresnelParameters.power = 2;
    mat.emissiveFresnelParameters.leftColor = toColor3(color);
    mat.emissiveFresnelParameters.rightColor = Color3.Black();
  }
  return mat;
}

// ─── Post-process state ──────────────────────────────────────

let pipeline: DefaultRenderingPipeline | null = null;

// ─── Theme ───────────────────────────────────────────────────

export const neonTheme: Theme = {
  id: "neon",
  name: "Neon",
  palette,

  applyToScene(scene: Scene, camera: Camera, quality: QualityLevel): void {
    scene.clearColor = new Color4(0, 0, 0, 1);
    scene.fogMode = Scene.FOGMODE_EXP;
    scene.fogDensity = 0.008;
    scene.fogColor = new Color3(0, 0, 0);

    if (quality !== "low") {
      pipeline = new DefaultRenderingPipeline("neonPipeline", true, scene, [
        camera,
      ]);
      pipeline.bloomEnabled = true;
      pipeline.bloomThreshold = 0.3;
      if (quality === "medium") {
        pipeline.bloomWeight = 0.3;
        pipeline.bloomKernel = 32;
        pipeline.bloomScale = 0.25;
      } else {
        pipeline.bloomWeight = 0.5;
        pipeline.bloomKernel = 64;
        pipeline.bloomScale = 0.5;
      }
    }
  },

  removeFromScene(_scene: Scene): void {
    if (pipeline) {
      pipeline.dispose();
      pipeline = null;
    }
  },

  createMaterials(scene: Scene): ThemeMaterials {
    return {
      laneMat: emissiveMat("neon_lane", palette.lanes, scene),
      playerMat: emissiveMat("neon_player", palette.player, scene, true),
      enemyMatA: emissiveMat("neon_enemyA", palette.enemyA, scene, true),
      enemyMatB: emissiveMat("neon_enemyB", palette.enemyB, scene, true),
      bulletMat: emissiveMat("neon_bullet", palette.bullet, scene),
    };
  },

  createVfxFactory(scene: Scene, quality: QualityLevel): VfxFactory {
    const killMat = emissiveMat("neon_vfx_kill", { r: 1, g: 1, b: 1 }, scene);
    const sparkMat = emissiveMat("neon_vfx_spark", palette.enemyA, scene);
    const hitMat = emissiveMat("neon_vfx_hit", palette.bullet, scene);
    const sparkCount = quality === "high" ? 5 : quality === "medium" ? 3 : 0;

    return {
      spawnExplosion(position: Vector3, sc: Scene): void {
        // Expanding ring
        const ring = MeshBuilder.CreateTorus(
          `neon_kill_${performance.now()}`,
          { diameter: 0.3, thickness: 0.06, tessellation: 16 },
          sc,
        );
        ring.position.copyFrom(position);
        ring.material = killMat;
        ring.isPickable = false;

        // Spark boxes flying outward
        const sparkMeshes: {
          mesh: ReturnType<typeof MeshBuilder.CreateBox>;
          vel: Vector3;
        }[] = [];
        for (let i = 0; i < sparkCount; i++) {
          const a = (i / sparkCount) * Math.PI * 2;
          const spark = MeshBuilder.CreateBox(
            `neon_spark_${i}_${performance.now()}`,
            { size: 0.08 },
            sc,
          );
          spark.position.copyFrom(position);
          spark.material = sparkMat;
          spark.isPickable = false;
          sparkMeshes.push({
            mesh: spark,
            vel: new Vector3(
              Math.cos(a) * 4,
              Math.sin(a) * 4,
              (Math.random() - 0.5) * 2,
            ),
          });
        }

        const start = performance.now();
        const dur = 300;

        const obs = sc.onBeforeRenderObservable.add(() => {
          const p = Math.min((performance.now() - start) / dur, 1);
          const dtSec = sc.getEngine().getDeltaTime() / 1000;

          // Ring
          const s = 0.3 + p * 2.0;
          ring.scaling.setAll(s);
          if (ring.material) ring.material.alpha = 1 - p;

          // Sparks
          for (const sp of sparkMeshes) {
            sp.mesh.position.addInPlace(sp.vel.scale(dtSec));
            sp.mesh.scaling.setAll(1 - p);
            if (sp.mesh.material) sp.mesh.material.alpha = 1 - p;
          }

          if (p >= 1) {
            ring.dispose();
            for (const sp of sparkMeshes) sp.mesh.dispose();
            sc.onBeforeRenderObservable.remove(obs);
          }
        });
      },

      spawnHit(position: Vector3, sc: Scene): void {
        const flash = MeshBuilder.CreateSphere(
          `neon_hit_${performance.now()}`,
          { diameter: 0.3, segments: 4 },
          sc,
        );
        flash.position.copyFrom(position);
        flash.material = hitMat;
        flash.isPickable = false;

        const start = performance.now();
        const dur = 80;

        const obs = sc.onBeforeRenderObservable.add(() => {
          const p = Math.min((performance.now() - start) / dur, 1);
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

export default neonTheme;
