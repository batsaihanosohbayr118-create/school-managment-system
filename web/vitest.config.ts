import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname, ".."),
  test: {
    environment: "node",
    include: ["web/lib/**/__tests__/**/*.test.ts", "shared/__tests__/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@shared": path.resolve(__dirname, "../shared")
    }
  }
});
