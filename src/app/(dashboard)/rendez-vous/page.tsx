import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Rendez-vous" };

export default function AppointmentsPage() {
  return (
    <ComingSoon
      title="Rendez-vous"
      description="Types de rendez-vous, disponibilités, réservation publique et rappels."
      icon={CalendarDays}
      sprint="Sprint 3"
    />
  );
}
