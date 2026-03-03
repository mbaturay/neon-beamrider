import type { EnemyType } from "./types.ts";
import { EnemyType as EnemyTypeValues } from "./types.ts";
import type { GameConfig } from "./config.ts";

// ─── Public types ──────────────────────────────────────────────

export interface SpawnCommand {
  enemyType: EnemyType;
  laneIndex: number;
}

export interface SpawnDirector {
  /** Call each fixed step. Returns zero or more spawn commands. */
  update(dt: number, elapsed: number, difficulty: number): SpawnCommand[];
}

// ─── Factory ───────────────────────────────────────────────────

/**
 * Creates a SpawnDirector that ramps enemy frequency over time.
 *
 * Spawn interval = baseSpawnInterval / difficulty.
 * Enemy type is chosen by weighted random selection using the seeded PRNG.
 * Lane is chosen uniformly at random.
 */
export function createSpawnDirector(
  config: GameConfig,
  random: () => number,
): SpawnDirector {
  let accumulator = 0;

  // Pre-compute weighted-selection table
  const typeEntries: { type: EnemyType; weight: number }[] = [
    {
      type: EnemyTypeValues.Runner,
      weight: config.enemyTypes.Runner.spawnWeight,
    },
    {
      type: EnemyTypeValues.Drifter,
      weight: config.enemyTypes.Drifter.spawnWeight,
    },
    {
      type: EnemyTypeValues.Charger,
      weight: config.enemyTypes.Charger.spawnWeight,
    },
  ];
  const totalWeight = typeEntries.reduce((sum, e) => sum + e.weight, 0);

  function pickEnemyType(): EnemyType {
    let roll = random() * totalWeight;
    for (const entry of typeEntries) {
      roll -= entry.weight;
      if (roll <= 0) return entry.type;
    }
    return typeEntries[typeEntries.length - 1].type; // fallback
  }

  function pickLane(): number {
    return Math.floor(random() * config.lanes);
  }

  const commands: SpawnCommand[] = [];

  return {
    update(dt: number, _elapsed: number, difficulty: number): SpawnCommand[] {
      commands.length = 0;
      const interval = config.baseSpawnInterval / difficulty;
      accumulator += dt;

      while (accumulator >= interval) {
        accumulator -= interval;
        commands.push({
          enemyType: pickEnemyType(),
          laneIndex: pickLane(),
        });
      }

      return commands;
    },
  };
}
