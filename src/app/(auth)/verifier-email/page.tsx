import type { Metadata } from "next";
import { VerifyEmailForm } from "@/features/auth/verify-email-form";

export const metadata: Metadata = { title: "Vérifiez votre e-mail" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return <VerifyEmailForm email={email ?? ""} />;
}
