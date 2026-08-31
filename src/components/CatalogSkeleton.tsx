/**
 * Khung xương (skeleton) hiển thị trong lúc dữ liệu danh mục đang tải,
 * giữ đúng bố cục để trang không bị "nhảy" khi dữ liệu về.
 */
import { Skeleton } from "@/components/ui/skeleton";

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-4 gap-2 p-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="aspect-square w-full rounded-md" />
          <Skeleton className="h-3 w-full rounded" />
        </div>
      ))}
    </div>
  );
}

export function ProductListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 p-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-2/3 rounded" />
          <Skeleton className="aspect-[4/3] w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div>
      <Skeleton className="h-11 w-full rounded-none" />
      <GridSkeleton />
      <ProductListSkeleton count={2} />
    </div>
  );
}
