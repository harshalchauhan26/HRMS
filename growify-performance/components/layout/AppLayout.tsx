import type { ReactNode } from "react";
import Topbar, { type Crumb } from "./Topbar";

export default function AppLayout({
  breadcrumbs,
  children,
}: {
  breadcrumbs: Crumb[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Topbar breadcrumbs={breadcrumbs} />
      <main className="mx-auto max-w-280 px-5 pt-8 pb-24">{children}</main>
    </div>
  );
}
