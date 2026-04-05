import { AdminBookDetailPage } from "@/components/AdminBookDetailPage";

export default async function AdminBookDetailRoute({ params }) {
  const resolvedParams = await params;

  return <AdminBookDetailPage id={resolvedParams.id} />;
}
