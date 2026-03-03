import type { GameState } from "../core/types.ts";
import { RunPhase } from "../core/types.ts";

/**
 * Manages the HTML HUD overlay.
 * Pure DOM updates — no frameworks.
 */
export class Hud {
  private readonly elScore: HTMLElement;
  private readonly elMultiplier: HTMLElement;
  private readonly elComboFill: HTMLElement;
  private readonly elSpeed: HTMLElement;
  private readonly elTheme: HTMLElement;
  private readonly elGameover: HTMLElement;
  private readonly elGameoverScore: HTMLElement;

  private cachedScore = -1;
  private cachedMultiplier = -1;
  private cachedPhase: string = "";
  private cachedDifficulty = -1;

  constructor() {
    this.elScore = this.require("hud-score");
    this.elMultiplier = this.require("hud-multiplier");
    this.elComboFill = this.require("hud-combo-fill");
    this.elSpeed = this.require("hud-speed");
    this.elTheme = this.require("hud-theme");
    this.elGameover = this.require("hud-gameover");
    this.elGameoverScore = this.require("hud-gameover-score");
  }

  /** Update HUD from game state. Call once per frame. */
  update(state: Readonly<GameState>): void {
    const player = state.player;

    // Score (only touch DOM when changed)
    if (player.score !== this.cachedScore) {
      this.cachedScore = player.score;
      this.elScore.textContent = `SCORE: ${player.score}`;
    }

    // Multiplier
    if (player.multiplier !== this.cachedMultiplier) {
      this.cachedMultiplier = player.multiplier;
      this.elMultiplier.textContent = `x${player.multiplier}`;
      this.elMultiplier.dataset.active =
        player.multiplier > 1 ? "true" : "false";
    }

    // Combo timer bar (smooth — update every frame when active)
    if (player.comboTimer > 0) {
      const pct = (player.comboTimer / 2.0) * 100; // 2s = comboWindowSeconds
      this.elComboFill.style.width = `${Math.min(pct, 100)}%`;
    } else {
      this.elComboFill.style.width = "0%";
    }

    // Speed / difficulty level
    const roundedDiff = Math.floor(state.difficulty * 10) / 10;
    if (roundedDiff !== this.cachedDifficulty) {
      this.cachedDifficulty = roundedDiff;
      this.elSpeed.textContent = `SPD ${roundedDiff.toFixed(1)}`;
    }

    // Phase transitions
    if (state.phase !== this.cachedPhase) {
      this.cachedPhase = state.phase;

      if (state.phase === RunPhase.GameOver) {
        this.elGameover.dataset.visible = "true";
        this.elGameoverScore.textContent = `${player.score}`;
      } else {
        this.elGameover.dataset.visible = "false";
      }
    }
  }

  /** Update the displayed theme name. */
  setThemeName(name: string): void {
    this.elTheme.textContent = name.toUpperCase();
  }

  /** Reset cached values so next update() rewrites all DOM nodes. */
  reset(): void {
    this.cachedScore = -1;
    this.cachedMultiplier = -1;
    this.cachedPhase = "";
    this.cachedDifficulty = -1;
  }

  private require(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) throw new Error(`HUD element #${id} not found`);
    return el;
  }
}
