export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-8 text-center">
        <span className="font-display text-2xl font-bold tracking-tight text-primary">
          Kora<span className="text-accent">Flow</span>
        </span>
        <p className="text-sm text-muted-foreground">Plus loin, ensemble</p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
