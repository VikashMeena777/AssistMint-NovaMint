// Matches the payments page: header + 4 stat cards + payments list (4 columns)
import { SkeletonHeader, SkeletonStatsGrid, SkeletonTable } from '@/components/ui/skeleton';

export default function PaymentsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonStatsGrid count={4} />
      <SkeletonTable rows={6} cols={4} />
    </div>
  );
}
