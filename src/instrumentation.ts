export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Le build produit une image générique ; les secrets réels n'existent qu'au
  // démarrage du conteneur et sont alors validés avant la première requête.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { validateServerEnvironment } = await import("@/lib/env/server");
  validateServerEnvironment();
}
