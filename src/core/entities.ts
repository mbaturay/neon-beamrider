import type { EnemyEntity, BulletEntity, EnemyType } from "./types.ts";
import { EntityTag } from "./types.ts";
import type { EnemyTypeConfig, GameConfig } from "./config.ts";

// ─── Factory functions ─────────────────────────────────────────

export function createEnemy(
  id: number,
  enemyType: EnemyType,
  laneIndex: number,
  zStart: number,
  typeConfig: EnemyTypeConfig,
): EnemyEntity {
  return {
    tag: EntityTag.Enemy,
    id,
    enemyType,
    laneIndex,
    z: zStart,
    speed: typeConfig.speed,
    hp: typeConfig.hp,
    alive: true,
  };
}

export function createBullet(
  id: number,
  laneIndex: number,
  zStart: number,
  speed: number,
): BulletEntity {
  return {
    tag: EntityTag.Bullet,
    id,
    laneIndex,
    z: zStart,
    speed,
    alive: true,
  };
}

// ─── Movement ──────────────────────────────────────────────────

/**
 * Advance all living enemies toward z = 0.
 * Returns ids of enemies that reached the player zone (z <= nearThreshold).
 */
export function updateEnemies(
  enemies: EnemyEntity[],
  dt: number,
  nearThreshold: number,
): number[] {
  const reached: number[] = [];
  for (const e of enemies) {
    if (!e.alive) continue;
    e.z -= e.speed * dt; // enemies advance toward z = 0
    if (e.z <= nearThreshold) {
      reached.push(e.id);
      e.alive = false;
    }
  }
  return reached;
}

/**
 * Advance all living bullets away from the player (z increases).
 * Mark dead if past zFar.
 */
export function updateBullets(
  bullets: BulletEntity[],
  dt: number,
  zFar: number,
): void {
  for (const b of bullets) {
    if (!b.alive) continue;
    b.z += b.speed * dt; // bullets travel toward zFar
    if (b.z >= zFar) {
      b.alive = false;
    }
  }
}

// ─── Collision detection ───────────────────────────────────────

export interface HitResult {
  enemyId: number;
  bulletId: number;
  enemyType: EnemyType;
  laneIndex: number;
  z: number;
}

/**
 * Check alive bullets against alive enemies.
 * Hit condition: same lane AND |Δz| < hitWindow.
 * Each bullet can hit at most one enemy per step.
 */
export function detectCollisions(
  enemies: EnemyEntity[],
  bullets: BulletEntity[],
  config: GameConfig,
): HitResult[] {
  const hits: HitResult[] = [];

  for (const b of bullets) {
    if (!b.alive) continue;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (b.laneIndex !== e.laneIndex) continue;
      if (Math.abs(b.z - e.z) < config.hitWindow) {
        e.hp -= 1;
        b.alive = false; // bullet consumed
        if (e.hp <= 0) {
          e.alive = false;
          hits.push({
            enemyId: e.id,
            bulletId: b.id,
            enemyType: e.enemyType,
            laneIndex: e.laneIndex,
            z: e.z,
          });
        }
        break; // this bullet is spent; next bullet
      }
    }
  }

  return hits;
}

// ─── Garbage collection ────────────────────────────────────────

/** In-place compaction: removes dead entities with no allocation. */
export function sweep<T extends { alive: boolean }>(entities: T[]): T[] {
  let write = 0;
  for (let read = 0; read < entities.length; read++) {
    if (entities[read].alive) {
      entities[write] = entities[read];
      write++;
    }
  }
  entities.length = write;
  return entities;
}
