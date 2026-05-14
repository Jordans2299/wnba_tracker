import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-court-950">
      <nav className="border-b border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-6">
          <Link href="/admin" className="text-sm font-semibold text-white">
            Admin
          </Link>
          <Link href="/admin/pending" className="text-xs text-court-400 hover:text-white transition-colors">
            Pending Updates
          </Link>
          <Link href="/" className="ml-auto text-xs text-court-500 hover:text-white transition-colors">
            View Site
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
