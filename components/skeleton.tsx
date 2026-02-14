import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-muted", className)}
      {...props}
    />
  );
}

export function ForecastSkeleton() {
  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-7 w-72" />
      </div>
      <Skeleton className="mb-6 h-36 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-72 w-full rounded-xl" />
    </div>
  );
}
