import { Suspense } from "react";
import { PrintView } from "./print-view";

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <PrintView id={id} />
    </Suspense>
  );
}
