import { SkeletonHeader, SkeletonToolbar, SkeletonTable } from '@/components/ui/skeleton';

export default function CampaignsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonToolbar />
      <SkeletonTable rows={5} cols={5} />
    </div>
  );
}
