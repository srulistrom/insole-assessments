import { Suspense } from "react";
import { JobsList } from "./jobs-list";

export default function JobsPage() {
  return (
    <Suspense>
      <JobsList />
    </Suspense>
  );
}
