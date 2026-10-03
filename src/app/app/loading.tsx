import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 py-8 md:px-6">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="mt-3 h-4 w-80" />
      <Skeleton className="mt-8 h-48 w-full" />
    </div>
  );
}
