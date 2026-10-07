import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';
import { effectivePlan, hasPlan } from '@/lib/subscription';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function storageConfig() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  return {
    endpoint,
    bucket: process.env.R2_BUCKET_NAME || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || '',
  };
}

function client() {
  const config = storageConfig();
  if (!config.endpoint || !config.bucket || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error('R2_NOT_CONFIGURED');
  }
  return new S3Client({
    region: process.env.R2_REGION || 'auto',
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await req.json();
  const type = String(payload.contentType || '');
  const size = Number(payload.size || 0);
  const folder = String(payload.folder || 'uploads');
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];

  if (!allowed.includes(type) || size <= 0 || size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Invalid image. Use JPG, PNG or WebP up to 5MB.' }, { status: 400 });
  }

  const config = storageConfig();
  if (!config.endpoint || !config.bucket || !config.accessKeyId || !config.secretAccessKey) {
    return NextResponse.json({ error: 'Storage is not configured. Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME.' }, { status: 503 });
  }

  let prefix = '';
  if (folder === 'profiles') {
    prefix = `users/${session.user.id}/profile`;
  } else {
    const businessId = String(payload.businessId || '');
    const membership = await db.businessMembership.findUnique({
      where: { businessId_userId: { businessId, userId: session.user.id } },
      include: { business: { include: { subscription: true } } },
    });
    if (!membership || membership.role === 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!hasPlan(effectivePlan(membership.business.subscription), 'STARTER')) return NextResponse.json({ error: 'Business image customization is available on Starter and Pro.' }, { status: 403 });
    const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, '');
    prefix = `businesses/${businessId}/${safeFolder || 'uploads'}`;
  }

  const extension = type.split('/')[1];
  const key = `${prefix}/${crypto.randomUUID()}.${extension}`;
  const uploadUrl = await getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: type }),
    { expiresIn: 900 },
  );
  const publicUrl = config.publicBaseUrl ? `${config.publicBaseUrl.replace(/\/$/, '')}/${key}` : null;

  return NextResponse.json({ key, uploadUrl, publicUrl });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = new URL(req.url).searchParams.get('key') || '';
  const ownProfilePrefix = `users/${session.user.id}/profile/`;
  if (!key.startsWith(ownProfilePrefix)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const config = storageConfig();
  if (!config.endpoint || !config.bucket || !config.accessKeyId || !config.secretAccessKey) {
    return NextResponse.json({ error: 'Storage is not configured.' }, { status: 503 });
  }

  const url = await getSignedUrl(client(), new GetObjectCommand({ Bucket: config.bucket, Key: key }), { expiresIn: 900 });
  return NextResponse.redirect(url);
}
