import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import type { EnemyEntity, BulletEntity, EnemyType } from "../core/types.ts";
import type { GameConfig } from "../core/config.ts";
import type { MaterialSet } from "./materials.ts";
import { mapLaneZToWorld, laneAngle } from "./mapping.ts";
import { cloneEnemyMesh, cloneBulletMesh } from "./meshFactory.ts";

/**
 * Tracks the mapping between game entity IDs and Babylon meshes.
 * Creates, positions, and disposes meshes as entities come and go.
 */
export class EntityPool {
  private readonly enemies = new Map<number, TransformNode>();
  private readonly bullets = new Map<number, Mesh>();
  private readonly enemyTemplates: Record<EnemyType, TransformNode>;
  private readonly bulletTemplate: Mesh;
  private readonly scene: Scene;
  private readonly materials: MaterialSet;
  private readonly lanes: number;

  constructor(
    enemyTemplates: Record<EnemyType, TransformNode>,
    bulletTemplate: Mesh,
    scene: Scene,
    materials: MaterialSet,
    config: Readonly<GameConfig>,
  ) {
    this.enemyTemplates = enemyTemplates;
    this.bulletTemplate = bulletTemplate;
    this.scene = scene;
    this.materials = materials;
    this.lanes = config.lanes;
  }

  /**
   * Create / update / dispose enemy meshes to match game state.
   * Positions are interpolated between previous and current tick.
   */
  syncEnemies(
    enemies: readonly EnemyEntity[],
    alpha: number,
    fixedDt: number,
  ): void {
    const activeIds = new Set<number>();

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      activeIds.add(enemy.id);

      let node = this.enemies.get(enemy.id);
      if (!node) {
        node = cloneEnemyMesh(
          this.enemyTemplates[enemy.enemyType],
          enemy.id,
          this.scene,
          this.materials,
          enemy.enemyType,
        );
        this.enemies.set(enemy.id, node);
      }

      // Interpolate z: enemy moves z -= speed*dt, so previous z was higher
      const prevZ = enemy.z + enemy.speed * fixedDt;
      const interpZ = prevZ + (enemy.z - prevZ) * alpha;
      const pos = mapLaneZToWorld(enemy.laneIndex, interpZ, this.lanes);
      node.position.copyFrom(pos);

      // Orient: local Y points radially outward
      const angle = laneAngle(enemy.laneIndex, this.lanes);
      node.rotation.z = angle - Math.PI / 2;
    }

    // Dispose meshes for enemies no longer alive
    for (const [id, node] of this.enemies) {
      if (!activeIds.has(id)) {
        node.dispose(false, true);
        this.enemies.delete(id);
      }
    }
  }

  /**
   * Create / update / dispose bullet meshes to match game state.
   */
  syncBullets(
    bullets: readonly BulletEntity[],
    alpha: number,
    fixedDt: number,
  ): void {
    const activeIds = new Set<number>();

    for (const bullet of bullets) {
      if (!bullet.alive) continue;
      activeIds.add(bullet.id);

      let mesh = this.bullets.get(bullet.id);
      if (!mesh) {
        mesh = cloneBulletMesh(this.bulletTemplate, bullet.id);
        this.bullets.set(bullet.id, mesh);
      }

      // Interpolate z: bullet moves z += speed*dt, so previous z was lower
      const prevZ = bullet.z - bullet.speed * fixedDt;
      const interpZ = prevZ + (bullet.z - prevZ) * alpha;
      const pos = mapLaneZToWorld(bullet.laneIndex, interpZ, this.lanes);
      mesh.position.copyFrom(pos);

      // Orient along ring
      const angle = laneAngle(bullet.laneIndex, this.lanes);
      mesh.rotation.z = angle - Math.PI / 2;
    }

    for (const [id, mesh] of this.bullets) {
      if (!activeIds.has(id)) {
        mesh.dispose();
        this.bullets.delete(id);
      }
    }
  }

  /** Dispose all tracked meshes. */
  disposeAll(): void {
    for (const [, node] of this.enemies) node.dispose(false, true);
    this.enemies.clear();
    for (const [, mesh] of this.bullets) mesh.dispose();
    this.bullets.clear();
  }
}
