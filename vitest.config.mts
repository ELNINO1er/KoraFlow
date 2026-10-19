import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
    // Charge .env (DATABASE_URL) pour les tests d'intégration touchant PostgreSQL.
    setupFiles: ["dotenv/config"],
    // NB : les tests d'intégration partagent UNE base PostgreSQL (données
    // isolées par organisation, connexions partagées). Sous très forte
    // parallélisation de fichiers, des échecs de sérialisation transitoires /
    // une pression sur les connexions peuvent apparaître — ce n'est PAS une
    // course de données (cf. docs/TESTS_CI.md). Côté application, le rejeu des
    // transactions sérialisables durcit la robustesse ; côté CI, la suite
    // d'intégration se lance avec `vitest run --no-file-parallelism`.
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` n'a pas de runtime hors du bundler Next.js.
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
  },
});
