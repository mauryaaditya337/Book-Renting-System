import { EditBookForm } from "@/components/EditBookForm";

export default async function EditBookPage({ params }) {
  const resolvedParams = await params;

  return <EditBookForm bookId={resolvedParams.id} />;
}
