import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin, requireUser } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser().catch(() => null);

  if (!user) {
    redirect('/login');
  }

  try {
    await requireAdmin(user.id);
  } catch {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      <header className="border-b bg-[#111238] px-5 py-4 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/admin" className="font-black">
            Brell Admin
          </Link>

          <Link
            href="/dashboard"
            className="text-sm text-slate-300 transition hover:text-white"
          >
            Back to app
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-5 md:p-8">{children}</div>
    </div>
  );
}