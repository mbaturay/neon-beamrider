import type { Theme, ThemeId } from "./themeTypes.ts";
import { neonTheme } from "./neon/index.ts";

/**
 * Load a theme by ID.
 * Neon is statically imported (always available).
 * Retro and Chunky are dynamically imported for code splitting.
 */
export async function loadTheme(id: ThemeId): Promise<Theme> {
  switch (id) {
    case "neon":
      return neonTheme;
    case "retro": {
      const mod = await import("./retro/index.ts");
      return mod.retroTheme;
    }
    case "chunky": {
      const mod = await import("./chunky/index.ts");
      return mod.chunkyTheme;
    }
  }
}
