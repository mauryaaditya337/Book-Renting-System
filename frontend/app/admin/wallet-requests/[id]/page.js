import { AdminWalletRequestDetailPage } from "@/components/AdminWalletRequestDetailPage";

export default async function AdminWalletRequestDetailRoute({ params }) {
  const resolvedParams = await params;

  return <AdminWalletRequestDetailPage id={resolvedParams.id} />;
}
