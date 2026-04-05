import { AdminUserDetailPage } from "@/components/AdminUserDetailPage";

export default function AdminUserDetailRoute({ params }) {
  return <AdminUserDetailPage id={params.id} />;
}
