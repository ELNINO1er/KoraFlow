import { Header } from "@/features/marketing/header";
import { Footer } from "@/features/marketing/footer";
import { MotionPreferencesProvider } from "@/features/marketing/motion-preferences";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <MotionPreferencesProvider><Header /><main className="flex-1 pb-20 pt-32">{children}</main><Footer /></MotionPreferencesProvider>;
}
