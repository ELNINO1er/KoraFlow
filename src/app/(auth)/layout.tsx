import {
  MotionPreferencesProvider,
  MotionToggleButton,
} from "@/features/marketing/motion-preferences";

/**
 * Enveloppe des pages d'authentification. La mise en page (deux volets) est
 * portée par AuthShell dans chaque page ; ici on fournit seulement la gestion
 * des préférences de mouvement + la bascule « Réduire les animations ».
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionPreferencesProvider>
      {children}
      <MotionToggleButton />
    </MotionPreferencesProvider>
  );
}
