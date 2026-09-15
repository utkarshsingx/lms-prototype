import type { Metadata } from "next";
import { AuditLogsPage } from "@/components/admin/config/audit-page";

export const metadata: Metadata = { title: "Audit logs" };

export default function Page() {
  return <AuditLogsPage />;
}
