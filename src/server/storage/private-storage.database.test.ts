import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../database/client";
import { deletePrivateFile, getPrivateFile, listPrivateFiles, putPrivateFile } from "./private-storage";

/** Pilote « database » : fichiers privés dans la table private_file (base isolée). */
const PREFIX = "tests-db-driver";
let previous: string | undefined;

beforeAll(() => {
  previous = process.env.STORAGE_DRIVER;
  process.env.STORAGE_DRIVER = "database";
});

afterAll(async () => {
  await prisma.privateFile.deleteMany({ where: { key: { startsWith: PREFIX } } });
  process.env.STORAGE_DRIVER = previous;
  await prisma.$disconnect();
});

describe("stockage privé dans la base", () => {
  it("écrit, relit, liste et supprime un fichier à l'octet près", async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 255, 1, 2]);
    await putPrivateFile(`${PREFIX}/logo.png`, bytes);

    expect(Buffer.compare(await getPrivateFile(`${PREFIX}/logo.png`), Buffer.from(bytes))).toBe(0);
    expect(await listPrivateFiles(PREFIX)).toEqual([`${PREFIX}/logo.png`]);

    await deletePrivateFile(`${PREFIX}/logo.png`);
    await expect(getPrivateFile(`${PREFIX}/logo.png`)).rejects.toThrow();
  });

  it("ne réécrit jamais une clé existante (code EEXIST, comme le pilote local)", async () => {
    await putPrivateFile(`${PREFIX}/archive.pdf`, new Uint8Array([1]));
    await expect(putPrivateFile(`${PREFIX}/archive.pdf`, new Uint8Array([2]))).rejects.toMatchObject({ code: "EEXIST" });
    expect([...(await getPrivateFile(`${PREFIX}/archive.pdf`))]).toEqual([1]);
  });

  it("refuse une clé qui sort du stockage", async () => {
    await expect(putPrivateFile("../etc/passwd.txt", new Uint8Array([1]))).rejects.toThrow("Clé de stockage invalide.");
  });
});
