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

// ─── Colors (r, g, b in 0–1) ────────────────────────────────
export const COLOR_LANE = { r: 0, g: 1, b: 1 };
export const COLOR_PLAYER = { r: 0.2, g: 0.8, b: 1 };
export const COLOR_BULLET = { r: 1, g: 1, b: 0.4 };
export const COLOR_ENEMY_RUNNER = { r: 1, g: 0.2, b: 0.2 };
export const COLOR_ENEMY_DRIFTER = { r: 0.8, g: 0.2, b: 1 };
export const COLOR_ENEMY_CHARGER = { r: 1, g: 0.6, b: 0 };
export const COLOR_KILL_RING = { r: 1, g: 1, b: 1 };
export const COLOR_TUBE = { r: 0.02, g: 0.05, b: 0.08 };

// ─── Mesh sizing ─────────────────────────────────────────────
export const PLAYER_SCALE = 0.6;
export const ENEMY_SCALE = 0.5;
export const BULLET_RADIUS = 0.08;
export const BULLET_LENGTH = 0.6;
export const KILL_RING_DURATION_MS = 300;
export const KILL_RING_MAX_SCALE = 2.0;
