import { requirePlatformAdmin } from "@/server/auth/platform";
import { AdminSecurityForm } from "@/features/admin/security-form";

export default async function AdminSecurityPage() {
  const admin = await requirePlatformAdmin({ requireTwoFactor: false });
  return <div className="mx-auto flex max-w-2xl flex-col gap-5">
    <div><h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-foreground">Sécurité de votre accès administrateur</h1>
      <p className="mt-2 text-sm text-muted-foreground">La double authentification est obligatoire pour accéder aux données et aux actions de la console plateforme.</p></div>
    <AdminSecurityForm enabled={Boolean(admin.twoFactorEnabled)} />
  </div>;
}
