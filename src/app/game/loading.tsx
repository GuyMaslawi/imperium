import {
  Skeleton,
  SkeletonGrid,
  SkeletonHeading,
  SkeletonPage,
} from "@/components/ui/Skeleton";

/**
 * Fallback loading state for any /game/* route that doesn't ship its own
 * skeleton. Every screen with a known shape has a `loading.tsx` next to its
 * `page.tsx` mirroring that shape; this one only claims what is safe to assume
 * anywhere — a titled screen made of panels.
 *
 * The layout (command bar + sidebar + frame) stays mounted around it.
 */
export default function GameLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeading />
      <Skeleton className="h-24 rounded-xl" />
      <SkeletonGrid count={6} tile="h-40" />
    </SkeletonPage>
  );
}
