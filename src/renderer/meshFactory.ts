import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";
import type { EnemyType } from "../core/types.ts";
import type { MaterialSet } from "./materials.ts";
import {
  RING_RADIUS,
  TUBE_LENGTH,
  TUBE_RADIUS,
  TUBE_TESSELLATION,
  PLAYER_SCALE,
  ENEMY_SCALE,
  BULLET_RADIUS,
  BULLET_LENGTH,
} from "./constants.ts";
import { laneAngle } from "./mapping.ts";

// ─── Environment ─────────────────────────────────────────────

export function createTube(scene: Scene, materials: MaterialSet): Mesh {
  const tube = MeshBuilder.CreateCylinder(
    "tube",
    {
      height: TUBE_LENGTH,
      diameter: TUBE_RADIUS * 2,
      tessellation: TUBE_TESSELLATION,
      sideOrientation: Mesh.BACKSIDE, // render inside faces
    },
    scene,
  );
  // Cylinder default axis = Y; rotate to align with Z
  tube.rotation.x = Math.PI / 2;
  tube.position.z = TUBE_LENGTH / 2;
  tube.material = materials.tube;
  tube.isPickable = false;
  return tube;
}

export function createLaneLines(
  scene: Scene,
  totalLanes: number,
  materials: MaterialSet,
): Mesh {
  const lines: Vector3[][] = [];
  const colors: Color4[][] = [];
  const c = new Color4(
    materials.lane.emissiveColor.r,
    materials.lane.emissiveColor.g,
    materials.lane.emissiveColor.b,
    0.6,
  );

  for (let i = 0; i < totalLanes; i++) {
    const angle = laneAngle(i, totalLanes);
    const x = RING_RADIUS * Math.cos(angle);
    const y = RING_RADIUS * Math.sin(angle);
    lines.push([new Vector3(x, y, 0), new Vector3(x, y, TUBE_LENGTH)]);
    colors.push([c.clone(), c.clone()]);
  }

  const lineSystem = MeshBuilder.CreateLineSystem(
    "laneLines",
    { lines, colors },
    scene,
  );
  lineSystem.isPickable = false;
  return lineSystem;
}

// ─── Player ship ─────────────────────────────────────────────

export function createPlayerShip(
  scene: Scene,
  materials: MaterialSet,
): TransformNode {
  const S = PLAYER_SCALE;
  const root = new TransformNode("player", scene);

  // Main body
  const body = MeshBuilder.CreateBox(
    "player_body",
    { width: 0.8 * S, height: 0.3 * S, depth: 1.5 * S },
    scene,
  );
  body.material = materials.player;
  body.parent = root;

  // Left pod
  const leftPod = MeshBuilder.CreateBox(
    "player_lpod",
    { width: 0.3 * S, height: 0.2 * S, depth: 0.8 * S },
    scene,
  );
  leftPod.position.set(-0.55 * S, 0, -0.2 * S);
  leftPod.material = materials.player;
  leftPod.parent = root;

  // Right pod
  const rightPod = MeshBuilder.CreateBox(
    "player_rpod",
    { width: 0.3 * S, height: 0.2 * S, depth: 0.8 * S },
    scene,
  );
  rightPod.position.set(0.55 * S, 0, -0.2 * S);
  rightPod.material = materials.player;
  rightPod.parent = root;

  // Engine disc
  const engine = MeshBuilder.CreateDisc(
    "player_engine",
    { radius: 0.25 * S, tessellation: 12 },
    scene,
  );
  engine.position.z = -0.75 * S;
  engine.rotation.x = Math.PI / 2;
  engine.material = materials.bullet; // warm accent for engine glow
  engine.parent = root;

  return root;
}

// ─── Enemy templates ─────────────────────────────────────────

export function createEnemyTemplates(
  scene: Scene,
  materials: MaterialSet,
): Record<EnemyType, TransformNode> {
  return {
    Runner: createRunnerTemplate(scene, materials),
    Drifter: createDrifterTemplate(scene, materials),
    Charger: createChargerTemplate(scene, materials),
  };
}

function createRunnerTemplate(
  scene: Scene,
  materials: MaterialSet,
): TransformNode {
  const S = ENEMY_SCALE;
  const root = new TransformNode("tmpl_runner", scene);
  root.setEnabled(false);

  // Diamond: two opposing cones tip-to-tip
  const top = MeshBuilder.CreateCylinder(
    "runner_top",
    { height: 0.6 * S, diameterTop: 0, diameterBottom: 0.7 * S, tessellation: 4 },
    scene,
  );
  top.position.y = 0.3 * S;
  top.material = materials.enemyRunner;
  top.parent = root;

  const bottom = MeshBuilder.CreateCylinder(
    "runner_bot",
    { height: 0.6 * S, diameterTop: 0.7 * S, diameterBottom: 0, tessellation: 4 },
    scene,
  );
  bottom.position.y = -0.3 * S;
  bottom.material = materials.enemyRunner;
  bottom.parent = root;

  return root;
}

function createDrifterTemplate(
  scene: Scene,
  materials: MaterialSet,
): TransformNode {
  const S = ENEMY_SCALE;
  const root = new TransformNode("tmpl_drifter", scene);
  root.setEnabled(false);

  // Center block
  const center = MeshBuilder.CreateBox(
    "drifter_c",
    { width: 0.3 * S, height: 0.15 * S, depth: 0.6 * S },
    scene,
  );
  center.material = materials.enemyDrifter;
  center.parent = root;

  // Left wing (swept back)
  const lw = MeshBuilder.CreateBox(
    "drifter_l",
    { width: 0.6 * S, height: 0.1 * S, depth: 0.3 * S },
    scene,
  );
  lw.position.set(-0.4 * S, 0, -0.15 * S);
  lw.rotation.y = 0.4;
  lw.material = materials.enemyDrifter;
  lw.parent = root;

  // Right wing (mirror)
  const rw = MeshBuilder.CreateBox(
    "drifter_r",
    { width: 0.6 * S, height: 0.1 * S, depth: 0.3 * S },
    scene,
  );
  rw.position.set(0.4 * S, 0, -0.15 * S);
  rw.rotation.y = -0.4;
  rw.material = materials.enemyDrifter;
  rw.parent = root;

  return root;
}

function createChargerTemplate(
  scene: Scene,
  materials: MaterialSet,
): TransformNode {
  const S = ENEMY_SCALE;
  const root = new TransformNode("tmpl_charger", scene);
  root.setEnabled(false);

  // Spear: elongated cone pointing toward player (-z)
  const spear = MeshBuilder.CreateCylinder(
    "charger_spear",
    { height: 1.2 * S, diameterTop: 0, diameterBottom: 0.4 * S, tessellation: 6 },
    scene,
  );
  spear.rotation.x = -Math.PI / 2; // point forward
  spear.material = materials.enemyCharger;
  spear.parent = root;

  // Flat base disc
  const base = MeshBuilder.CreateDisc(
    "charger_base",
    { radius: 0.25 * S, tessellation: 6 },
    scene,
  );
  base.position.z = 0.6 * S;
  base.rotation.x = Math.PI / 2;
  base.material = materials.enemyCharger;
  base.parent = root;

  return root;
}

// ─── Bullet template ─────────────────────────────────────────

export function createBulletTemplate(
  scene: Scene,
  materials: MaterialSet,
): Mesh {
  const bullet = MeshBuilder.CreateCylinder(
    "tmpl_bullet",
    { height: BULLET_LENGTH, diameter: BULLET_RADIUS * 2, tessellation: 6 },
    scene,
  );
  bullet.rotation.x = Math.PI / 2; // orient along z
  bullet.material = materials.bullet;
  bullet.setEnabled(false);
  return bullet;
}

// ─── Clone helpers ───────────────────────────────────────────

export function cloneEnemyMesh(
  template: TransformNode,
  entityId: number,
  scene: Scene,
  materials: MaterialSet,
  enemyType: EnemyType,
): TransformNode {
  const root = new TransformNode(`enemy_${entityId}`, scene);

  // Clone each child mesh from the template
  for (const child of template.getChildMeshes()) {
    const clone = (child as Mesh).clone(`enemy_${entityId}_${child.name}`, root);
    if (clone) {
      // Re-assign material (shared reference) based on enemy type
      clone.material =
        enemyType === "Runner"
          ? materials.enemyRunner
          : enemyType === "Drifter"
            ? materials.enemyDrifter
            : materials.enemyCharger;
    }
  }

  root.setEnabled(true);
  return root;
}

export function cloneBulletMesh(template: Mesh, entityId: number): Mesh {
  const clone = template.clone(`bullet_${entityId}`);
  if (!clone) throw new Error(`Failed to clone bullet for entity ${entityId}`);
  clone.setEnabled(true);
  return clone;
}
