import { redirect } from "next/navigation";
import { resolvePlatformAdmin } from "@/server/auth/platform";

export default async function LoginSuccessPage() {
  const admin = await resolvePlatformAdmin();
  redirect(admin ? "/admin" : "/dashboard");
}
