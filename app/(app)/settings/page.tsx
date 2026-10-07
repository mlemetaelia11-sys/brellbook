import { requireBusiness, requireUser } from '@/lib/auth';
import { Card } from '@/components/ui';

export default async function BusinessSettings() {
  const user = await requireUser();
  const business = await requireBusiness(user.id);

  const fields = [
    ['Business name', business.name],
    ['Category', business.category || ''],
    ['Phone', business.phone],
    ['WhatsApp', business.whatsappNumber || ''],
    ['City', business.city || ''],
    ['Address', business.address || ''],
  ] as const;

  return (
    <div className="p-5 md:p-8">
      <h1 className="text-3xl font-black">
        Business Information
      </h1>

      <Card className="mt-6 max-w-3xl p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label}>
              <label className="mb-2 block text-sm font-semibold">
                {label}
              </label>

              <input
                className="input"
                defaultValue={value}
                name={label
                  .toLowerCase()
                  .replace(/\s+/g, '_')}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-primary mt-6"
        >
          Save changes
        </button>
      </Card>
    </div>
  );
}