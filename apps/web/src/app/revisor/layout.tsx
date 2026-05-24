import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      <AdminSidebar />
      <main className="ml-64 flex-1 flex flex-col h-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}
