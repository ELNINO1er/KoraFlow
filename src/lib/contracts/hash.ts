import { createHash } from "node:crypto";

/**
 * Empreinte SHA-256 du contenu EXACT d'un contrat tel qu'affiché au signataire.
 *
 * Partagée entre la page publique (qui calcule l'empreinte de la version
 * affichée) et le service de signature (qui la revérifie côté serveur) afin que
 * la version lue par le client soit bien celle qui est signée. Toute divergence
 * (contrat corrigé puis renvoyé entre-temps) doit faire échouer la signature.
 */
export function hashContractContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
