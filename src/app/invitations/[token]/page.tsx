import type { Metadata } from "next";
import Link from "next/link";
import { resolveSession } from "@/server/auth/context";
import { getInvitationByToken } from "@/server/repositories/membership-repository";
import { roleLabel } from "@/lib/constants/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AcceptInvitationButton } from "@/features/team/accept-invitation-button";

export const metadata: Metadata = { title: "Invitation" };

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);
  const session = await resolveSession();

  const shell = (children: React.ReactNode) => (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <span className="font-display text-2xl font-bold tracking-tight text-primary">
        Kora<span className="text-accent">Flow</span>
      </span>
      <div className="w-full max-w-md">{children}</div>
    </main>
  );

  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    return shell(
      <Card>
        <CardContent className="p-6 text-center">
          <p className="font-medium text-foreground">Invitation indisponible</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ce lien d’invitation est invalide, a expiré ou a déjà été utilisé.
          </p>
        </CardContent>
      </Card>,
    );
  }

  const invited = invitation.email;
  const loggedInEmail =
    session.status === "ok"
      ? session.context.user.email
      : session.status === "no-organization"
        ? session.user.email
        : null;

  return shell(
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Rejoindre {invitation.organization.name}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Vous êtes invité en tant que <strong>{roleLabel(invitation.role)}</strong> ({invited}).
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {loggedInEmail === null ? (
          <>
            <p className="text-sm text-muted-foreground">
              Connectez-vous ou créez un compte avec l’adresse <strong>{invited}</strong> pour accepter.
            </p>
            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <Link href="/register">Créer un compte</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/login">Se connecter</Link>
              </Button>
            </div>
          </>
        ) : loggedInEmail.toLowerCase() !== invited.toLowerCase() ? (
          <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
            Vous êtes connecté avec {loggedInEmail}, mais cette invitation est
            destinée à {invited}. Déconnectez-vous puis reconnectez-vous avec la bonne adresse.
          </p>
        ) : (
          <AcceptInvitationButton token={token} />
        )}
      </CardContent>
    </Card>,
  );
}
