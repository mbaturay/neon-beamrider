import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Color4 } from "@babylonjs/core/Maths/math.color";

/**
 * Top-level Babylon.js application.
 * Owns the engine, scene, and render loop.
 */
export class App {
  private engine: Engine;
  private scene: Scene;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });

    this.scene = this.createScene();

    // Render loop
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    // Resize handler
    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }

  private createScene(): Scene {
    const scene = new Scene(this.engine);
    scene.clearColor = new Color4(0, 0, 0, 1);

    // Default camera — will be replaced by gameplay camera later
    const camera = new FreeCamera(
      "defaultCamera",
      new Vector3(0, 5, -10),
      scene,
    );
    camera.setTarget(Vector3.Zero());
    camera.attachControl(this.engine.getRenderingCanvas()!, false);

    // Minimal ambient light
    const light = new HemisphericLight(
      "ambientLight",
      new Vector3(0, 1, 0),
      scene,
    );
    light.intensity = 0.7;

    return scene;
  }

  /** Graceful teardown */
  dispose(): void {
    this.scene.dispose();
    this.engine.dispose();
  }
}
