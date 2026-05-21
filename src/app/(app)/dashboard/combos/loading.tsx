import { SkeletonHeader, SkeletonToolbar, SkeletonItemGrid } from '@/components/ui/skeleton';

export default function CombosLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonToolbar />
      <SkeletonItemGrid count={6} />
    </div>
  );
}
