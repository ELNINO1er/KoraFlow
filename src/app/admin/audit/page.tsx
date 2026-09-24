import type { Metadata } from "next";
import { listAuditLog } from "@/server/services/platform-admin";
import { formatDateTime } from "@/lib/formatting/currency";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Journal d'audit" };

export default async function AdminAuditPage() {
  const entries = await listAuditLog(150);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Journal d&apos;audit
        </h1>
        <p className="text-sm text-muted-foreground">
          150 dernières opérations sensibles, toutes organisations confondues.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Action</th>
                  <th className="pb-2 pr-4">Acteur</th>
                  <th className="pb-2 pr-4">Organisation</th>
                  <th className="pb-2 pr-4">Cible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-xs text-muted-foreground">
                      {formatDateTime(e.createdAt)}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-foreground">{e.action}</td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {e.actor?.email ?? "système"}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {e.organization?.name ?? "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {e.targetType ? `${e.targetType}` : "—"}
                    </td>
                  </tr>
                ))}
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      Aucune entrée d&apos;audit.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
