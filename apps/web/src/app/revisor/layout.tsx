"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { isAuthenticated } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === "/revisor/login") {
      setChecked(true);
      return;
    }
    if (!isAuthenticated()) {
      router.replace("/revisor/login");
    } else {
      setChecked(true);
    }
  }, [pathname, router]);

  if (pathname === "/revisor/login") {
    return <>{children}</>;
  }

  if (!checked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      <AdminSidebar />
      <main className="ml-64 flex-1 flex flex-col h-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}
