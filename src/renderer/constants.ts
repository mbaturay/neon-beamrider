// ─── Ring geometry ───────────────────────────────────────────
export const RING_RADIUS = 8;
export const Z_SCALE = 1.0;
export const TUBE_LENGTH = 130; // slightly > zFar (120)
export const TUBE_RADIUS = 9.5; // slightly > RING_RADIUS
export const TUBE_TESSELLATION = 24;

// ─── Camera ──────────────────────────────────────────────────
export const CAMERA_Z = -5;
export const CAMERA_FOV = 1.2; // radians (~69°)
export const CAMERA_SWAY_AMPLITUDE = 0.015;
export const CAMERA_SWAY_SPEED = 0.4; // cycles per second

// ─── Mesh sizing ─────────────────────────────────────────────
export const PLAYER_SCALE = 0.6;
export const ENEMY_SCALE = 0.5;
export const BULLET_RADIUS = 0.08;
export const BULLET_LENGTH = 0.6;
export const KILL_RING_DURATION_MS = 300;
export const KILL_RING_MAX_SCALE = 2.0;
export const GATE_DIAMETER = 1.4;
export const GATE_THICKNESS = 0.12;
export const GATE_TESSELLATION = 16;

// ─── Warp visual tuning ─────────────────────────────────────
export const WARP_AMBIENT_INTENSITY = 0.55;
export const NORMAL_AMBIENT_INTENSITY = 0.15;
export const WARP_SWAY_MULTIPLIER = 3;
