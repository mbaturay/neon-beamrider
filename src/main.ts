import { App } from "./renderer/App.ts";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;

if (!canvas) {
  throw new Error("Canvas element #game-canvas not found");
}

// Boot the Babylon.js application
const _app = new App(canvas);

// Expose for debugging in dev
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__app = _app;
}
