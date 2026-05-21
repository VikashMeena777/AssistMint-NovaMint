import { SkeletonHeader, SkeletonStatsGrid, SkeletonTable } from '@/components/ui/skeleton';

export default function LoyaltyLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonStatsGrid count={3} />
      <SkeletonTable rows={5} cols={4} />
    </div>
  );
}
