import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { RING_RADIUS, Z_SCALE } from "./constants.ts";

/**
 * Lane angle on the ring (radians).
 * Lane 0 at 0 rad, proceeding counterclockwise.
 */
export function laneAngle(laneIndex: number, totalLanes: number): number {
  return (2 * Math.PI * laneIndex) / totalLanes;
}

/**
 * Static scratch vector returned by mapLaneZToWorld.
 * All call sites immediately copyFrom() or read the result before the next
 * call, so sharing a single instance is safe and avoids per-frame allocation.
 */
const _scratch = new Vector3();

/**
 * Convert game-space (laneIndex, z) to Babylon world position.
 *
 * Lanes sit on a circle of RING_RADIUS in the XY plane.
 * z maps directly to world-z (depth into the tube).
 *
 * WARNING: Returns a shared scratch vector. Callers must copyFrom()
 * or consume the value before the next call to this function.
 */
export function mapLaneZToWorld(
  laneIndex: number,
  z: number,
  totalLanes: number,
): Vector3 {
  const angle = laneAngle(laneIndex, totalLanes);
  _scratch.set(
    RING_RADIUS * Math.cos(angle),
    RING_RADIUS * Math.sin(angle),
    z * Z_SCALE,
  );
  return _scratch;
}
