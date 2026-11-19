import { ConvertForm } from "./convert-form";

export default async function ConvertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ConvertForm id={id} />;
}
