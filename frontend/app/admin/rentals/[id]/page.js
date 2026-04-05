import { AdminRentalDetailPage } from "@/components/AdminRentalDetailPage";

export default async function AdminRentalDetailRoute({ params }) {
  const resolvedParams = await params;

  return <AdminRentalDetailPage id={resolvedParams.id} />;
}
