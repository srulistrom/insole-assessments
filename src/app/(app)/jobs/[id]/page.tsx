import { Suspense } from "react";
import { JobDetail } from "./job-detail";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <JobDetail id={id} />
    </Suspense>
  );
}
