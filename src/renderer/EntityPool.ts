import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import type { EnemyEntity, BulletEntity, GateEntity, EnemyType } from "../core/types.ts";
import type { MaterialSet } from "./materials.ts";
import { mapLaneZToWorld, laneAngle } from "./mapping.ts";
import { cloneEnemyMesh, cloneBulletMesh, cloneGateMesh } from "./meshFactory.ts";

/**
 * Tracks the mapping between game entity IDs and Babylon meshes.
 * Uses free-lists to recycle meshes instead of dispose/re-clone.
 * Reuses a single Set across sync calls to avoid per-frame allocations.
 */
export class EntityPool {
  // Active entity → mesh mappings
  private readonly enemies = new Map<number, TransformNode>();
  private readonly bullets = new Map<number, Mesh>();
  private readonly gates = new Map<number, Mesh>();

  // Track enemy type per ID so we return meshes to the right free list
  private readonly enemyTypes = new Map<number, EnemyType>();

  // Free lists (meshes with setEnabled(false), ready for reuse)
  private readonly enemyFree: Record<EnemyType, TransformNode[]> = {
    Runner: [],
    Drifter: [],
    Charger: [],
  };
  private readonly bulletFree: Mesh[] = [];
  private readonly gateFree: Mesh[] = [];

  // Single reusable Set — cleared between sync calls
  private readonly _activeIds = new Set<number>();

  private enemyTemplates: Record<EnemyType, TransformNode>;
  private bulletTemplate: Mesh;
  private gateTemplate: Mesh;
  private readonly scene: Scene;
  private materials: MaterialSet;
  private readonly lanes: number;

  constructor(
    enemyTemplates: Record<EnemyType, TransformNode>,
    bulletTemplate: Mesh,
    gateTemplate: Mesh,
    scene: Scene,
    materials: MaterialSet,
    lanes: number,
  ) {
    this.enemyTemplates = enemyTemplates;
    this.bulletTemplate = bulletTemplate;
    this.gateTemplate = gateTemplate;
    this.scene = scene;
    this.materials = materials;
    this.lanes = lanes;
  }

  /**
   * Rebuild with new templates and materials (on theme switch).
   * Disposes all existing clones and free-lists — they'll be re-created next frame.
   */
  rebuild(
    enemyTemplates: Record<EnemyType, TransformNode>,
    bulletTemplate: Mesh,
    gateTemplate: Mesh,
    materials: MaterialSet,
  ): void {
    this.disposeAll();
    this.enemyTemplates = enemyTemplates;
    this.bulletTemplate = bulletTemplate;
    this.gateTemplate = gateTemplate;
    this.materials = materials;
  }

  syncEnemies(
    enemies: readonly EnemyEntity[],
    alpha: number,
    fixedDt: number,
  ): void {
    const activeIds = this._activeIds;
    activeIds.clear();

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      activeIds.add(enemy.id);

      let node = this.enemies.get(enemy.id);
      if (!node) {
        node = this.acquireEnemy(enemy.enemyType, enemy.id);
        this.enemies.set(enemy.id, node);
        this.enemyTypes.set(enemy.id, enemy.enemyType);
      }

      const prevZ = enemy.z + enemy.speed * fixedDt;
      const interpZ = prevZ + (enemy.z - prevZ) * alpha;
      const pos = mapLaneZToWorld(enemy.laneIndex, interpZ, this.lanes);
      node.position.copyFrom(pos);

      const angle = laneAngle(enemy.laneIndex, this.lanes);
      node.rotation.z = angle - Math.PI / 2;
    }

    for (const [id, node] of this.enemies) {
      if (!activeIds.has(id)) {
        this.releaseEnemy(id, node);
      }
    }
  }

  syncBullets(
    bullets: readonly BulletEntity[],
    alpha: number,
    fixedDt: number,
  ): void {
    const activeIds = this._activeIds;
    activeIds.clear();

    for (const bullet of bullets) {
      if (!bullet.alive) continue;
      activeIds.add(bullet.id);

      let mesh = this.bullets.get(bullet.id);
      if (!mesh) {
        mesh = this.acquireBullet(bullet.id);
        this.bullets.set(bullet.id, mesh);
      }

      const prevZ = bullet.z - bullet.speed * fixedDt;
      const interpZ = prevZ + (bullet.z - prevZ) * alpha;
      const pos = mapLaneZToWorld(bullet.laneIndex, interpZ, this.lanes);
      mesh.position.copyFrom(pos);

      const angle = laneAngle(bullet.laneIndex, this.lanes);
      mesh.rotation.z = angle - Math.PI / 2;
    }

    for (const [id, mesh] of this.bullets) {
      if (!activeIds.has(id)) {
        mesh.setEnabled(false);
        this.bulletFree.push(mesh);
        this.bullets.delete(id);
      }
    }
  }

  syncGates(gates: readonly GateEntity[]): void {
    const activeIds = this._activeIds;
    activeIds.clear();

    for (const gate of gates) {
      if (!gate.alive) continue;
      activeIds.add(gate.id);

      let mesh = this.gates.get(gate.id);
      if (!mesh) {
        mesh = this.acquireGate(gate.id);
        this.gates.set(gate.id, mesh);
      }

      // Gates are stationary — no interpolation needed
      const pos = mapLaneZToWorld(gate.laneIndex, gate.z, this.lanes);
      mesh.position.copyFrom(pos);

      const angle = laneAngle(gate.laneIndex, this.lanes);
      mesh.rotation.z = angle - Math.PI / 2;
    }

    for (const [id, mesh] of this.gates) {
      if (!activeIds.has(id)) {
        mesh.setEnabled(false);
        this.gateFree.push(mesh);
        this.gates.delete(id);
      }
    }
  }

  disposeAll(): void {
    for (const [, node] of this.enemies) node.dispose(false, true);
    this.enemies.clear();
    this.enemyTypes.clear();
    for (const [, mesh] of this.bullets) mesh.dispose();
    this.bullets.clear();
    for (const [, mesh] of this.gates) mesh.dispose();
    this.gates.clear();

    // Dispose free-list meshes too
    for (const list of Object.values(this.enemyFree)) {
      for (const node of list) node.dispose(false, true);
      list.length = 0;
    }
    for (const mesh of this.bulletFree) mesh.dispose();
    this.bulletFree.length = 0;
    for (const mesh of this.gateFree) mesh.dispose();
    this.gateFree.length = 0;
  }

  // ── Free-list acquire/release ──────────────────────────────

  private acquireEnemy(type: EnemyType, entityId: number): TransformNode {
    const free = this.enemyFree[type];
    if (free.length > 0) {
      const node = free.pop()!;
      node.setEnabled(true);
      return node;
    }
    return cloneEnemyMesh(
      this.enemyTemplates[type],
      entityId,
      this.scene,
      this.materials,
      type,
    );
  }

  private releaseEnemy(id: number, node: TransformNode): void {
    node.setEnabled(false);
    const type = this.enemyTypes.get(id);
    if (type) {
      this.enemyFree[type].push(node);
      this.enemyTypes.delete(id);
    }
    this.enemies.delete(id);
  }

  private acquireBullet(entityId: number): Mesh {
    if (this.bulletFree.length > 0) {
      const mesh = this.bulletFree.pop()!;
      mesh.setEnabled(true);
      return mesh;
    }
    return cloneBulletMesh(this.bulletTemplate, entityId);
  }

  private acquireGate(entityId: number): Mesh {
    if (this.gateFree.length > 0) {
      const mesh = this.gateFree.pop()!;
      mesh.setEnabled(true);
      return mesh;
    }
    return cloneGateMesh(this.gateTemplate, entityId);
  }
}
