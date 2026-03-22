import { RequestBookForm } from "@/components/RequestBookForm";

export default async function RequestBookPage({ params }) {
  const resolvedParams = await params;

  return <RequestBookForm bookId={resolvedParams.id} />;
}
