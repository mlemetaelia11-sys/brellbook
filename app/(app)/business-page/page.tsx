import { requireBusiness, requireUser } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { Card, CopyButton } from '@/components/ui';

export default async function BusinessPage() {
  const user = await requireUser();
  const business = await requireBusiness(user.id);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const publicUrl = `${appUrl}/${business.slug}`;

  return (
    <div className="p-5 md:p-8">
      <PageHeader
        title="Business Page"
        description="The public page customers use to book with you."
      />

      <Card className="max-w-3xl p-6">
        <div className="rounded-2xl bg-[#111238] p-8 text-white">
          <div className="text-sm text-purple-200">
            Your public booking page
          </div>

          <div className="mt-2 break-all text-2xl font-black">
            {publicUrl}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <CopyButton value={publicUrl} />

            <a
              className="btn bg-white text-[#1B1B3A]"
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open page
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="font-bold">
              Branding
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Your public page uses your business name, logo, accent color
              and business information.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="font-bold">
              Customization
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Logo, description, contacts, location and theme settings
              can be managed from your business settings.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}