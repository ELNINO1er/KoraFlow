import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveSession, TRIAL_EXPIRED_PATH } from "@/server/auth/context";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const session = await resolveSession();
  if (session.status === "ok") redirect("/dashboard");
  if (session.status === "no-organization") redirect("/create-organization");
  if (session.status === "trial-expired") redirect(TRIAL_EXPIRED_PATH);
  const { reason } = await searchParams;
  return <LoginForm sessionExpired={reason === "inactivity"} />;
}
