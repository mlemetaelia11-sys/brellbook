import { requireBusiness, requireUser } from '@/lib/auth';
import { PLANS } from '@/lib/plans';
import { Card } from '@/components/ui';
import Link from 'next/link';

type CheckoutProps = {
  searchParams: Promise<{
    plan?: keyof typeof PLANS;
  }>;
};

const PLAN_NAMES: Record<keyof typeof PLANS, string> = {
  FREE: 'Free',
  STARTER: 'Starter',
  PRO: 'Pro',
};

export default async function Checkout({
  searchParams,
}: CheckoutProps) {
  const query = await searchParams;

  const key =
    query.plan && query.plan in PLANS
      ? query.plan
      : 'STARTER';

  const plan = PLANS[key];

  const user = await requireUser();
  const business = await requireBusiness(user.id);

  const planName = PLAN_NAMES[key];

  return (
    <div className="grid min-h-[calc(100vh-64px)] place-items-center p-5">
      <Card className="w-full max-w-xl p-8">
        <div>
          <p className="text-sm font-semibold text-[#6C2BFF]">
            BrellBook subscription
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-900">
            Checkout
          </h1>

          <p className="mt-2 text-slate-500">
            {planName} plan for {business.name}
          </p>
        </div>

        <div className="my-7 rounded-2xl bg-slate-50 p-6">
          <div className="text-sm text-slate-500">
            Selected plan
          </div>

          <div className="mt-1 text-xl font-bold text-slate-900">
            {planName}
          </div>

          <div className="mt-5 text-sm text-slate-500">
            Amount
          </div>

          <div className="mt-2 text-3xl font-black text-slate-900">
            TSh {plan.price.toLocaleString()}
          </div>
        </div>

        <div className="space-y-3">
          {plan.price === 0 ? (
            <Link
              className="btn btn-primary block w-full text-center"
              href="/subscription"
            >
              Continue with Free
            </Link>
          ) : (
            <>
              <Link
                className="btn btn-primary block w-full text-center"
                href={`/subscription?plan=${encodeURIComponent(key)}`}
              >
                Continue to payment
              </Link>

              <p className="text-center text-xs text-slate-400">
                Payment is verified server-side before subscription
                activation.
              </p>
            </>
          )}

          <Link
            href="/subscription"
            className="block text-center text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            Change plan
          </Link>
        </div>
      </Card>
    </div>
  );
}