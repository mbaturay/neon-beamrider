import type { GameState, EnemyType } from "./types.ts";
import { RunPhase, WarpPhase } from "./types.ts";
import type { GameConfig } from "./config.ts";
import { DEFAULT_CONFIG } from "./config.ts";
import type { InputAction } from "./input.ts";
import { InputAction as Actions } from "./input.ts";
import type { GameEvent } from "./events.ts";
import { GameEventKind, EventQueue } from "./events.ts";
import { createPrng } from "./prng.ts";
import {
  createEnemy,
  createBullet,
  createGate,
  updateEnemies,
  updateBullets,
  detectCollisions,
  detectGateCollisions,
  sweep,
} from "./entities.ts";
import type { SpawnDirector, SpawnCommand } from "./spawn.ts";
import { createSpawnDirector } from "./spawn.ts";

/**
 * Core game simulation.
 *
 * Owns all game state. Completely engine- and DOM-agnostic.
 * The renderer calls `update(dt)` each frame and reads state / events.
 */
export class Game {
  private readonly config: GameConfig;
  private state: GameState;
  private readonly eventQueue: EventQueue;
  private random: () => number;
  private spawnDirector: SpawnDirector;
  private accumulator = 0;
  private fireHeld = false;

  constructor(configOverrides?: Partial<GameConfig>) {
    this.config = configOverrides
      ? { ...DEFAULT_CONFIG, ...configOverrides }
      : DEFAULT_CONFIG;
    this.eventQueue = new EventQueue();
    this.random = createPrng(Date.now());
    this.spawnDirector = createSpawnDirector(this.config, this.random);
    this.state = this.createInitialState();
  }

  // ── Public API ───────────────────────────────────────────────

  /** Readonly snapshot of current state (for renderer). */
  getState(): Readonly<GameState> {
    return this.state;
  }

  /** Readonly config (for renderer to read lanes, zFar, etc.). */
  getConfig(): Readonly<GameConfig> {
    return this.config;
  }

  /**
   * Advance the simulation by `dtSeconds` (wall-clock delta).
   * Uses a fixed-timestep accumulator internally.
   * Returns all events emitted during this frame.
   */
  update(dtSeconds: number): readonly GameEvent[] {
    if (this.state.phase !== RunPhase.Playing) {
      return this.eventQueue.drain();
    }

    // Clamp to prevent spiral of death
    const clamped = Math.min(dtSeconds, this.config.maxAccumulatedDt);
    this.accumulator += clamped;

    while (this.accumulator >= this.config.fixedDt) {
      this.accumulator -= this.config.fixedDt;
      this.fixedStep(this.config.fixedDt);
    }

    return this.eventQueue.drain();
  }

  /**
   * Accumulator remainder as a fraction of fixedDt, in [0, 1).
   * The renderer can use this to interpolate entity positions.
   */
  getInterpolationAlpha(): number {
    return this.accumulator / this.config.fixedDt;
  }

  /** Handle a player input action (can be called at any time). */
  handleInput(action: InputAction): void {
    // Any gameplay action in Ready phase starts the run
    if (this.state.phase === RunPhase.Ready && action !== Actions.Pause) {
      this.state.phase = RunPhase.Playing;
      this.eventQueue.push({
        kind: GameEventKind.PhaseChanged,
        phase: RunPhase.Playing,
      });
    }

    if (this.state.phase !== RunPhase.Playing) return;

    const player = this.state.player;

    switch (action) {
      case Actions.LaneLeft:
        player.laneIndex =
          (player.laneIndex - 1 + this.config.lanes) % this.config.lanes;
        break;
      case Actions.LaneRight:
        player.laneIndex = (player.laneIndex + 1) % this.config.lanes;
        break;
      case Actions.FireDown:
        this.fireHeld = true;
        break;
      case Actions.FireUp:
        this.fireHeld = false;
        break;
      case Actions.Special:
        // stub — future mechanic
        break;
      case Actions.Pause:
        // stub — pause / unpause
        break;
    }
  }

  /** Reset to initial state. Optional seed for deterministic replay. */
  reset(seed?: number): void {
    this.random = createPrng(seed ?? Date.now());
    this.spawnDirector = createSpawnDirector(this.config, this.random);
    this.state = this.createInitialState();
    this.accumulator = 0;
    this.fireHeld = false;
    this.eventQueue.drain(); // discard stale events
  }

  // ── Fixed step ───────────────────────────────────────────────

  private fixedStep(dt: number): void {
    const st = this.state;
    st.tick += 1;
    st.elapsed += dt;

    // 1. Ramp difficulty
    st.difficulty = Math.min(
      1.0 + st.elapsed * this.config.difficultyRampPerSecond,
      this.config.maxDifficulty,
    );

    // 2. Warp transitions
    this.updateWarp(dt);

    // 3. Auto-fire / manual fire
    this.handleFiring(dt);

    // 4. Move bullets
    updateBullets(st.bullets, dt, this.config.zFar);

    // 5. Spawn enemies (reduced during warp)
    const spawnDt =
      st.warpPhase === WarpPhase.Warp
        ? dt * this.config.warpSpawnMultiplier
        : dt;
    const spawns = this.spawnDirector.update(
      spawnDt,
      st.elapsed,
      st.difficulty,
    );
    this.processSpawns(spawns);

    // 6. Spawn gates (warp only)
    this.spawnGates(dt);

    // 7. Move enemies
    const reached = updateEnemies(
      st.enemies,
      dt,
      this.config.nearThreshold,
    );

    // 8. Collision detection (bullet→enemy)
    const hits = detectCollisions(st.enemies, st.bullets, this.config);

    // 9. Collision detection (bullet→gate, warp only)
    const gateHits = detectGateCollisions(
      st.gates,
      st.bullets,
      this.config.hitWindow,
    );

    // 10. Process kills (scoring, combos)
    for (const hit of hits) {
      this.processKill(hit.enemyType, hit.enemyId, hit.laneIndex, hit.z);
    }

    // 11. Process gate hits (bonus scoring)
    for (const hit of gateHits) {
      this.processGateHit(hit.gateId, hit.laneIndex, hit.z);
    }

    // 12. Enemy reached player → game over
    if (reached.length > 0) {
      this.processPlayerHit(reached[0]);
      return;
    }

    // 13. Decay combo timer
    this.decayCombo(dt);

    // 14. Sweep dead entities
    sweep(st.enemies);
    sweep(st.bullets);
    sweep(st.gates);
  }

  // ── Firing ───────────────────────────────────────────────────

  private handleFiring(dt: number): void {
    const player = this.state.player;
    player.fireCooldownRemaining = Math.max(
      0,
      player.fireCooldownRemaining - dt,
    );

    const shouldFire =
      (this.config.autoFireEnabled || this.fireHeld) &&
      player.fireCooldownRemaining <= 0;

    if (shouldFire) {
      const id = this.state.nextEntityId++;
      const bullet = createBullet(
        id,
        player.laneIndex,
        this.config.zNear, // bullet starts at player z
        this.config.bulletSpeed,
      );
      this.state.bullets.push(bullet);
      player.fireCooldownRemaining = 1.0 / this.config.fireRate;

      this.eventQueue.push({
        kind: GameEventKind.BulletFired,
        entityId: id,
        laneIndex: player.laneIndex,
      });
    }
  }

  // ── Spawning ─────────────────────────────────────────────────

  private processSpawns(commands: SpawnCommand[]): void {
    for (const cmd of commands) {
      const id = this.state.nextEntityId++;
      const typeConfig = this.config.enemyTypes[cmd.enemyType];
      const enemy = createEnemy(
        id,
        cmd.enemyType,
        cmd.laneIndex,
        this.config.zFar,
        typeConfig,
      );
      // Scale speed by current difficulty
      enemy.speed *= this.state.difficulty;
      this.state.enemies.push(enemy);

      this.eventQueue.push({
        kind: GameEventKind.EnemySpawned,
        entityId: id,
        enemyType: cmd.enemyType,
        laneIndex: cmd.laneIndex,
        z: this.config.zFar,
      });
    }
  }

  // ── Kill processing ──────────────────────────────────────────

  private processKill(
    enemyType: EnemyType,
    enemyId: number,
    laneIndex: number,
    z: number,
  ): void {
    const player = this.state.player;
    const typeConfig = this.config.enemyTypes[enemyType];
    const points = typeConfig.points * player.multiplier;

    // Extend combo
    player.comboCount += 1;
    player.comboTimer = this.config.comboWindowSeconds;

    // Recalculate multiplier from thresholds
    let newMultiplier = 1;
    for (const threshold of this.config.multiplierThresholds) {
      if (player.comboCount >= threshold) {
        newMultiplier += 1;
      } else {
        break;
      }
    }
    const multiplierChanged = player.multiplier !== newMultiplier;
    player.multiplier = newMultiplier;

    // Award score
    player.score += points;

    this.eventQueue.push({
      kind: GameEventKind.EnemyKilled,
      entityId: enemyId,
      enemyType,
      laneIndex,
      z,
      points,
    });

    this.eventQueue.push({
      kind: GameEventKind.ScoreChanged,
      score: player.score,
      delta: points,
    });

    if (multiplierChanged) {
      this.eventQueue.push({
        kind: GameEventKind.ComboChanged,
        comboCount: player.comboCount,
        multiplier: player.multiplier,
      });
    }
  }

  // ── Damage / game over ───────────────────────────────────────

  private processPlayerHit(enemyId: number): void {
    const player = this.state.player;
    player.alive = false;
    this.state.phase = RunPhase.GameOver;

    this.eventQueue.push({
      kind: GameEventKind.PlayerHit,
      enemyId,
      laneIndex: player.laneIndex,
    });

    this.eventQueue.push({
      kind: GameEventKind.PhaseChanged,
      phase: RunPhase.GameOver,
    });
  }

  // ── Warp sequence ───────────────────────────────────────────

  private updateWarp(dt: number): void {
    const st = this.state;
    st.warpTimer -= dt;

    if (st.warpPhase === WarpPhase.Normal && st.warpTimer <= 0) {
      // Enter warp
      st.warpPhase = WarpPhase.Warp;
      st.warpTimer = this.config.warpDuration;
      st.gateSpawnAccumulator = 0;
      this.eventQueue.push({ kind: GameEventKind.WarpStarted });
    } else if (st.warpPhase === WarpPhase.Warp && st.warpTimer <= 0) {
      // Exit warp — kill remaining gates
      st.warpPhase = WarpPhase.Normal;
      st.warpTimer = this.config.warpInterval;
      for (const g of st.gates) g.alive = false;
      sweep(st.gates);
      this.eventQueue.push({ kind: GameEventKind.WarpEnded });
    }
  }

  private spawnGates(dt: number): void {
    const st = this.state;
    if (st.warpPhase !== WarpPhase.Warp) return;

    st.gateSpawnAccumulator += dt;
    if (st.gateSpawnAccumulator >= this.config.gateSpawnInterval) {
      st.gateSpawnAccumulator -= this.config.gateSpawnInterval;
      const laneIndex = Math.floor(this.random() * this.config.lanes);
      const z = 30 + this.random() * 70; // spread across visible tube
      const id = st.nextEntityId++;
      st.gates.push(createGate(id, laneIndex, z));
    }
  }

  private processGateHit(
    gateId: number,
    laneIndex: number,
    z: number,
  ): void {
    const player = this.state.player;
    const points = this.config.gatePoints * player.multiplier;

    // Extend combo
    player.comboCount += 1;
    player.comboTimer = this.config.comboWindowSeconds;

    // Recalculate multiplier
    let newMultiplier = 1;
    for (const threshold of this.config.multiplierThresholds) {
      if (player.comboCount >= threshold) {
        newMultiplier += 1;
      } else {
        break;
      }
    }
    const multiplierChanged = player.multiplier !== newMultiplier;
    player.multiplier = newMultiplier;

    player.score += points;

    this.eventQueue.push({
      kind: GameEventKind.GateHit,
      entityId: gateId,
      laneIndex,
      z,
      points,
    });

    this.eventQueue.push({
      kind: GameEventKind.ScoreChanged,
      score: player.score,
      delta: points,
    });

    if (multiplierChanged) {
      this.eventQueue.push({
        kind: GameEventKind.ComboChanged,
        comboCount: player.comboCount,
        multiplier: player.multiplier,
      });
    }
  }

  // ── Combo decay ──────────────────────────────────────────────

  private decayCombo(dt: number): void {
    const player = this.state.player;
    if (player.comboTimer <= 0) return;

    player.comboTimer -= dt;
    if (player.comboTimer <= 0) {
      player.comboTimer = 0;
      player.comboCount = 0;
      player.multiplier = 1;
      this.eventQueue.push({
        kind: GameEventKind.ComboChanged,
        comboCount: 0,
        multiplier: 1,
      });
    }
  }

  // ── Initial state factory ────────────────────────────────────

  private createInitialState(): GameState {
    return {
      phase: RunPhase.Ready,
      tick: 0,
      elapsed: 0,
      player: {
        laneIndex: this.config.playerStartLane,
        alive: true,
        fireCooldownRemaining: 0,
        score: 0,
        multiplier: 1,
        comboTimer: 0,
        comboCount: 0,
      },
      enemies: [],
      bullets: [],
      pickups: [],
      gates: [],
      nextEntityId: 1,
      spawnAccumulator: 0,
      difficulty: 1.0,
      warpPhase: WarpPhase.Normal,
      warpTimer: this.config.warpInterval,
      gateSpawnAccumulator: 0,
    };
  }
}
