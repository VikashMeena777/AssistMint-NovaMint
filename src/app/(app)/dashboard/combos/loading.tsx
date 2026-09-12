// Matches the combos page: header + combo card grid (no toolbar)
import { SkeletonHeader, SkeletonItemGrid } from '@/components/ui/skeleton';

export default function CombosLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonItemGrid count={6} />
    </div>
  );
}
