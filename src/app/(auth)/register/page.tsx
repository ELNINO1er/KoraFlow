import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveSession } from "@/server/auth/context";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function RegisterPage() {
  const session = await resolveSession();
  if (session.status === "ok") redirect("/dashboard");
  if (session.status === "no-organization") redirect("/create-organization");
  return <RegisterForm />;
}
