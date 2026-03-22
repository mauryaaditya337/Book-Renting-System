import { BookDetailsView } from "@/components/BookDetailsView";

export default async function BookDetailsPage({ params }) {
  const resolvedParams = await params;

  return <BookDetailsView id={resolvedParams.id} />;
}
