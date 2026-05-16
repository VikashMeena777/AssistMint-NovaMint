export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4 py-12">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[500px] rounded-full bg-mint/5 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-2xl shadow-xl shadow-primary/25">
            A
            <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-mint animate-pulse shadow-lg shadow-mint/50" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Assist<span className="text-primary">Mint</span>
          </h1>
        </div>

        {children}
      </div>
    </div>
  );
}
