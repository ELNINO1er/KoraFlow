import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveSession } from "@/server/auth/context";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage() {
  const session = await resolveSession();
  if (session.status === "ok") redirect("/dashboard");
  if (session.status === "no-organization") redirect("/create-organization");
  return <LoginForm />;
}
