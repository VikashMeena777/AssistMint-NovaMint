// Force dynamic rendering for all authenticated routes
// Dashboard pages require auth + real-time data
export const dynamic = 'force-dynamic';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
