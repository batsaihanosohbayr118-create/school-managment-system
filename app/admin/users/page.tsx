import { DashboardApp } from "@/components/dashboard/DashboardApp";

/** User management lives inside the admin dashboard; this URL opens it there. */
export default function AdminUsersPage() {
  return <DashboardApp initialView="users" lockedRole="admin" />;
}
