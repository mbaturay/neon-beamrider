import { Game, InputAction } from "./core/index.ts";
import { Renderer } from "./renderer/index.ts";
import { loadTheme } from "./themes/loadTheme.ts";
import type { ThemeId, QualityLevel } from "./themes/themeTypes.ts";
import type { Theme } from "./themes/themeTypes.ts";
import { Hud } from "./ui/hud.ts";

// ── Key → InputAction mapping ────────────────────────────────

const KEY_MAP: Record<string, InputAction> = {
  ArrowLeft: InputAction.LaneLeft,
  a: InputAction.LaneLeft,
  A: InputAction.LaneLeft,
  ArrowRight: InputAction.LaneRight,
  d: InputAction.LaneRight,
  D: InputAction.LaneRight,
  " ": InputAction.FireDown,
};

const THEME_MAP: Record<string, ThemeId> = {
  "1": "neon",
  "2": "retro",
  "3": "chunky",
};

const QUALITY_CYCLE: QualityLevel[] = ["low", "medium", "high"];

/**
 * Application controller.
 * Owns Game, Renderer, and Hud. Runs the rAF loop and routes input.
 */
export class App {
  private readonly game: Game;
  private readonly renderer: Renderer;
  private readonly hud: Hud;
  private themeSwitching = false;
  private qualityIndex = 2; // start at "high"
  private lastTime = 0;
  private rafId = 0;

  private constructor(game: Game, renderer: Renderer, hud: Hud) {
    this.game = game;
    this.renderer = renderer;
    this.hud = hud;
  }

  /** Async factory — loads initial theme then wires everything up. */
  static async create(canvas: HTMLCanvasElement): Promise<App> {
    const game = new Game();
    const theme = await loadTheme("neon");
    const renderer = new Renderer(canvas, game.getConfig(), theme);
    const hud = new Hud();

    const app = new App(game, renderer, hud);
    hud.setThemeName(theme.name);
    app.bindInput();
    return app;
  }

  /** Start the game loop. */
  start(): void {
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  /** Stop the game loop and clean up. */
  dispose(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.renderer.dispose();
  }

  // ── Input ──────────────────────────────────────────────────

  private bindInput(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    // Reset
    if (e.key === "r" || e.key === "R") {
      this.resetRun();
      return;
    }

    // Debug toggle
    if (e.key === "F1") {
      e.preventDefault();
      this.renderer.toggleDebug();
      return;
    }

    // Quality cycling
    if (e.key === "q" || e.key === "Q") {
      this.cycleQuality();
      return;
    }

    // Theme switching
    const themeId = THEME_MAP[e.key];
    if (themeId) {
      this.switchTheme(themeId);
      return;
    }

    // Game input
    const action = KEY_MAP[e.key];
    if (action) {
      e.preventDefault();
      this.game.handleInput(action);
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    if (e.key === " ") {
      this.game.handleInput(InputAction.FireUp);
    }
  };

  // ── Theme switching ────────────────────────────────────────

  private switchTheme(id: ThemeId): void {
    if (this.themeSwitching) return;
    this.themeSwitching = true;

    loadTheme(id)
      .then((theme: Theme) => {
        this.renderer.setTheme(theme);
        this.hud.setThemeName(theme.name);
        console.log("Theme:", id);
      })
      .catch((err: unknown) => {
        console.error("Failed to load theme:", err);
      })
      .finally(() => {
        this.themeSwitching = false;
      });
  }

  // ── Quality ─────────────────────────────────────────────────

  private cycleQuality(): void {
    this.qualityIndex = (this.qualityIndex + 1) % QUALITY_CYCLE.length;
    const quality = QUALITY_CYCLE[this.qualityIndex];
    this.renderer.setQuality(quality);
    console.log("Quality:", quality);
  }

  // ── Reset ──────────────────────────────────────────────────

  private resetRun(): void {
    this.game.reset();
    this.hud.reset();
  }

  // ── Game loop ──────────────────────────────────────────────

  private readonly frame = (now: number): void => {
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    const events = this.game.update(dt);
    const state = this.game.getState();
    const alpha = this.game.getInterpolationAlpha();

    this.renderer.render(state, alpha, events);
    this.hud.update(state);

    this.rafId = requestAnimationFrame(this.frame);
  };
}
