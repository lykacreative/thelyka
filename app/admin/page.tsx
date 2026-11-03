import { redirect } from "next/navigation";
import { AdminApp } from "@/components/admin/AdminApp";
import { getAdminSession } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { loadAdminItems, loadAdminPosts } from "@/lib/admin-data";
import { ensureBlogsMigrated } from "@/lib/blog-store";
import { cloudinaryReady, copyLiveStatus, environmentLabel } from "@/lib/admin-env";
import { cloudinaryRoot } from "@/lib/cloudinary-root";
import type { AdminEnvironment } from "@/lib/admin-types";

export const metadata = {
  title: "admin",
  description: "Manage the portfolio and the blog."
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const { db } = await connectToDatabase();
  // First visit after the switch: copy the old Cloudinary blog posts into MongoDB (once per database).
  const blogMigration = await ensureBlogsMigrated(db);
  const [items, posts, copyLive] = await Promise.all([loadAdminItems(db), loadAdminPosts(db), copyLiveStatus()]);

  const env: AdminEnvironment = {
    label: environmentLabel(),
    dbName: copyLive.currentDbName,
    cloudinaryRoot: cloudinaryRoot(process.env),
    cloudinaryReady: cloudinaryReady(),
    signedInAs: session.email ?? "password sign-in",
    copyLive: { enabled: copyLive.enabled, reason: copyLive.reason, liveDbName: copyLive.liveDbName },
    blogMigration: blogMigration.imported || blogMigration.error ? blogMigration : null
  };

  return <AdminApp initialItems={items} initialPosts={posts} env={env} />;
}
