import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { GameState } from "../core/types.ts";
import type { GameConfig } from "../core/config.ts";
import type { GameEvent } from "../core/events.ts";
import { GameEventKind } from "../core/events.ts";
import type { Theme } from "../themes/themeTypes.ts";
import type { MaterialSet } from "./materials.ts";
import { createMaterialSetFromTheme, disposeMaterialSet } from "./materials.ts";
import {
  createTube,
  createLaneLines,
  createPlayerShip,
  createEnemyTemplates,
  createBulletTemplate,
} from "./meshFactory.ts";
import { EntityPool } from "./EntityPool.ts";
import { EffectsManager } from "./effects.ts";
import { mapLaneZToWorld, laneAngle } from "./mapping.ts";
import {
  CAMERA_Z,
  CAMERA_FOV,
  CAMERA_SWAY_AMPLITUDE,
  CAMERA_SWAY_SPEED,
} from "./constants.ts";

export class Renderer {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: FreeCamera;
  private readonly config: Readonly<GameConfig>;

  // Theme-owned (rebuilt on setTheme)
  private theme: Theme;
  private materials: MaterialSet;
  private tubeMesh: Mesh;
  private laneLinesMesh: Mesh;
  private playerNode: TransformNode;
  private enemyTemplates: Record<string, TransformNode>;
  private bulletTemplate: Mesh;
  private entityPool: EntityPool;
  private effects: EffectsManager;

  constructor(
    canvas: HTMLCanvasElement,
    config: Readonly<GameConfig>,
    theme: Theme,
  ) {
    this.config = config;
    this.theme = theme;

    // ── Engine ────────────────────────────────────────────
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: false,
    });

    // ── Scene (bare — theme will configure it) ───────────
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0, 0, 0, 1);

    // ── Camera (non-interactive) ──────────────────────────
    this.camera = new FreeCamera(
      "mainCamera",
      new Vector3(0, 0, CAMERA_Z),
      this.scene,
    );
    this.camera.setTarget(new Vector3(0, 0, 100));
    this.camera.fov = CAMERA_FOV;

    // ── Lighting (dim ambient — emissive materials dominate)
    const ambient = new HemisphericLight(
      "ambient",
      new Vector3(0, 1, 0),
      this.scene,
    );
    ambient.intensity = 0.15;

    // ── Apply theme ───────────────────────────────────────
    theme.applyToScene(this.scene, this.camera);
    this.materials = createMaterialSetFromTheme(theme, this.scene);

    // ── Environment ───────────────────────────────────────
    this.tubeMesh = createTube(this.scene, this.materials);
    this.laneLinesMesh = createLaneLines(
      this.scene,
      config.lanes,
      this.materials,
    );

    // ── Player ────────────────────────────────────────────
    this.playerNode = createPlayerShip(this.scene, this.materials);

    // ── Entity pool ───────────────────────────────────────
    this.enemyTemplates = createEnemyTemplates(this.scene, this.materials);
    this.bulletTemplate = createBulletTemplate(this.scene, this.materials);
    this.entityPool = new EntityPool(
      this.enemyTemplates,
      this.bulletTemplate,
      this.scene,
      this.materials,
      config.lanes,
    );

    // ── Effects ───────────────────────────────────────────
    const vfx = theme.createVfxFactory(this.scene);
    this.effects = new EffectsManager(this.scene, vfx, config.lanes);

    // ── Resize ────────────────────────────────────────────
    window.addEventListener("resize", this.handleResize);
  }

  // ── Public API ──────────────────────────────────────────

  /**
   * Hot-swap the visual theme.
   * Disposes old post-processes and materials, applies new theme.
   */
  setTheme(theme: Theme): void {
    // 1. Remove old theme's scene-level effects (bloom, etc.)
    this.theme.removeFromScene(this.scene);

    // 2. Dispose old materials
    disposeMaterialSet(this.materials);

    // 3. Apply new theme to scene (clearColor, fog, post-process)
    theme.applyToScene(this.scene, this.camera);

    // 4. Create new materials
    this.materials = createMaterialSetFromTheme(theme, this.scene);

    // 5. Rebuild static meshes that hold material references
    //    Tube: reassign material
    this.tubeMesh.material = this.materials.tube;

    //    Player: reassign materials on child meshes
    const playerChildren = this.playerNode.getChildMeshes();
    for (const child of playerChildren) {
      if (child.name.includes("engine")) {
        child.material = this.materials.bullet;
      } else {
        child.material = this.materials.player;
      }
    }

    //    Lane lines: must recreate (vertex colors baked in)
    this.laneLinesMesh.dispose();
    this.laneLinesMesh = createLaneLines(
      this.scene,
      this.config.lanes,
      this.materials,
    );

    // 6. Rebuild enemy/bullet templates
    for (const tmpl of Object.values(this.enemyTemplates)) {
      tmpl.dispose(false, true);
    }
    this.bulletTemplate.dispose();

    this.enemyTemplates = createEnemyTemplates(this.scene, this.materials);
    this.bulletTemplate = createBulletTemplate(this.scene, this.materials);

    // 7. Rebuild entity pool (disposes all clones, swaps refs)
    this.entityPool.rebuild(
      this.enemyTemplates,
      this.bulletTemplate,
      this.materials,
    );

    // 8. Rebuild effects with new VFX factory
    const vfx = theme.createVfxFactory(this.scene);
    this.effects.setVfxFactory(vfx);

    // 9. Store new theme
    this.theme = theme;
  }

  /**
   * Render one frame. Called explicitly from the game loop.
   */
  render(
    state: Readonly<GameState>,
    alpha: number,
    events: readonly GameEvent[],
  ): void {
    const fixedDt = this.config.fixedDt;

    // 1. Event-driven VFX
    this.processEvents(events);

    // 2. Player
    this.updatePlayer(state);

    // 3. Entities
    this.entityPool.syncEnemies(state.enemies, alpha, fixedDt);
    this.entityPool.syncBullets(state.bullets, alpha, fixedDt);

    // 4. Camera sway
    this.updateCameraSway(state.elapsed);

    // 5. Render
    this.scene.render();
  }

  dispose(): void {
    window.removeEventListener("resize", this.handleResize);
    this.theme.removeFromScene(this.scene);
    this.entityPool.disposeAll();
    disposeMaterialSet(this.materials);
    this.scene.dispose();
    this.engine.dispose();
  }

  // ── Private ─────────────────────────────────────────────

  private readonly handleResize = (): void => {
    this.engine.resize();
  };

  private processEvents(events: readonly GameEvent[]): void {
    for (const ev of events) {
      switch (ev.kind) {
        case GameEventKind.EnemyKilled:
          this.effects.spawnKillRing(ev.laneIndex, ev.z);
          break;
        case GameEventKind.BulletFired:
          this.effects.spawnMuzzleFlash(ev.laneIndex);
          break;
      }
    }
  }

  private updatePlayer(state: Readonly<GameState>): void {
    const pos = mapLaneZToWorld(
      state.player.laneIndex,
      0,
      this.config.lanes,
    );
    this.playerNode.position.copyFrom(pos);

    const angle = laneAngle(state.player.laneIndex, this.config.lanes);
    this.playerNode.rotation.z = angle - Math.PI / 2;
  }

  private updateCameraSway(elapsed: number): void {
    this.camera.rotation.z =
      Math.sin(elapsed * CAMERA_SWAY_SPEED * 2 * Math.PI) *
      CAMERA_SWAY_AMPLITUDE;
  }
}
