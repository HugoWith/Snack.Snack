import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: "public",
  build: {
    rollupOptions: {
      input: {
        index: "index.html",
        merci: "merci.html",
        billet: "billet.html",
        admin: "admin.html",
      },
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/**/*.test.ts"],
          exclude: ["tests/db/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts"],
          env: loadEnv("test", ".", "DATABASE_URL"),
          setupFiles: ["tests/db/setup.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
