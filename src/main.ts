import { Game, InputAction } from "./core/index.ts";
import { Renderer } from "./renderer/index.ts";

// ── Canvas ────────────────────────────────────────────────────

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
if (!canvas) throw new Error("Canvas element #game-canvas not found");

// ── Game + Renderer ───────────────────────────────────────────

const game = new Game();
const renderer = new Renderer(canvas, game.getConfig());

// ── Keyboard input ────────────────────────────────────────────

const KEY_MAP: Record<string, InputAction> = {
  ArrowLeft: InputAction.LaneLeft,
  ArrowRight: InputAction.LaneRight,
  " ": InputAction.FireDown,
  Escape: InputAction.Pause,
};

window.addEventListener("keydown", (e) => {
  const action = KEY_MAP[e.key];
  if (action) {
    e.preventDefault();
    game.handleInput(action);
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === " ") {
    game.handleInput(InputAction.FireUp);
  }
});

// ── HUD ───────────────────────────────────────────────────────

const hudScore = document.getElementById("hud-score");
const hudSpeed = document.getElementById("hud-speed");

function updateHud(): void {
  const state = game.getState();
  if (hudScore) hudScore.textContent = `SCORE: ${state.player.score}`;
  if (hudSpeed) hudSpeed.textContent = `x${state.player.multiplier}`;
}

// ── Game loop ─────────────────────────────────────────────────

let lastTime = performance.now();

function frame(now: number): void {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  const events = game.update(dt);
  const state = game.getState();
  const alpha = game.getInterpolationAlpha();

  renderer.render(state, alpha, events);
  updateHud();

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// ── Dev tools ─────────────────────────────────────────────────

if (import.meta.env.DEV) {
  const g = window as unknown as Record<string, unknown>;
  g.__game = game;
  g.__renderer = renderer;
}
