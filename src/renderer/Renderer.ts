import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4, Color3 } from "@babylonjs/core/Maths/math.color";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { GameState } from "../core/types.ts";
import type { GameConfig } from "../core/config.ts";
import type { GameEvent } from "../core/events.ts";
import { GameEventKind } from "../core/events.ts";
import { createMaterials } from "./materials.ts";
import type { MaterialSet } from "./materials.ts";
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
  private readonly materials: MaterialSet;
  private readonly playerNode: TransformNode;
  private readonly entityPool: EntityPool;
  private readonly effects: EffectsManager;
  private readonly config: Readonly<GameConfig>;

  constructor(canvas: HTMLCanvasElement, config: Readonly<GameConfig>) {
    this.config = config;

    // ── Engine ────────────────────────────────────────────
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: false,
    });

    // ── Scene ─────────────────────────────────────────────
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0, 0, 0, 1);
    this.scene.fogMode = Scene.FOGMODE_EXP;
    this.scene.fogDensity = 0.008;
    this.scene.fogColor = new Color3(0, 0, 0);

    // ── Camera (non-interactive) ──────────────────────────
    this.camera = new FreeCamera(
      "mainCamera",
      new Vector3(0, 0, CAMERA_Z),
      this.scene,
    );
    this.camera.setTarget(new Vector3(0, 0, 100));
    this.camera.fov = CAMERA_FOV;
    // NOT attaching controls — camera is fixed

    // ── Lighting (dim ambient — emissive materials dominate) ──
    const ambient = new HemisphericLight(
      "ambient",
      new Vector3(0, 1, 0),
      this.scene,
    );
    ambient.intensity = 0.15;

    // ── Materials ─────────────────────────────────────────
    this.materials = createMaterials(this.scene);

    // ── Environment ───────────────────────────────────────
    createTube(this.scene, this.materials);
    createLaneLines(this.scene, config.lanes, this.materials);

    // ── Player ────────────────────────────────────────────
    this.playerNode = createPlayerShip(this.scene, this.materials);

    // ── Entity pool ───────────────────────────────────────
    const enemyTemplates = createEnemyTemplates(this.scene, this.materials);
    const bulletTemplate = createBulletTemplate(this.scene, this.materials);
    this.entityPool = new EntityPool(
      enemyTemplates,
      bulletTemplate,
      this.scene,
      this.materials,
      config,
    );

    // ── Effects ───────────────────────────────────────────
    this.effects = new EffectsManager(
      this.scene,
      this.materials,
      config.lanes,
    );

    // ── Resize ────────────────────────────────────────────
    window.addEventListener("resize", this.handleResize);
  }

  // ── Public API ──────────────────────────────────────────

  setTheme(_theme: string): void {
    // Stub — future: swap material colors per theme
  }

  /**
   * Render one frame. Called explicitly from the game loop
   * (no internal runRenderLoop).
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

    // 4. Effects
    this.effects.tick();

    // 5. Camera sway
    this.updateCameraSway(state.elapsed);

    // 6. Render
    this.scene.render();
  }

  dispose(): void {
    window.removeEventListener("resize", this.handleResize);
    this.entityPool.disposeAll();
    this.effects.disposeAll();
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
        // Other events: no VFX yet
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
