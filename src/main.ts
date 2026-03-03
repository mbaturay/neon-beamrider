import "./ui/styles.css";
import { App } from "./app.ts";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
if (!canvas) throw new Error("Canvas element #game-canvas not found");

App.create(canvas)
  .then((app) => {
    app.start();

    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__app = app;
    }
  })
  .catch((err: unknown) => {
    console.error("Failed to start game:", err);
  });
