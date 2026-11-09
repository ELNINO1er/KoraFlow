-- Liste d'attente de la landing publique.
CREATE TABLE "waitlist_entry" (
  "id" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "activity" TEXT,
  "country" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "waitlist_entry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "waitlist_entry_email_key" ON "waitlist_entry"("email");
