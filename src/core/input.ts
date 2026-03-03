// ─── Input Actions ─────────────────────────────────────────────
// Mapped from keyboard / gamepad by the renderer / UI layer.
// const-object + type-union pattern (erasableSyntaxOnly forbids enum).

export const InputAction = {
  LaneLeft: "LaneLeft",
  LaneRight: "LaneRight",
  FireDown: "FireDown",
  FireUp: "FireUp",
  Special: "Special", // stub for future mechanic
  Pause: "Pause",
} as const;

export type InputAction = (typeof InputAction)[keyof typeof InputAction];
