import { NextResponse } from 'next/server';
import { signIn } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const data = loginSchema.parse(await req.json());

    const result = await signIn('credentials', {
      email: data.email.toLowerCase(),
      password: data.password,
      redirect: false,
    });

    if (!result || result.error) {
      return NextResponse.json(
        {
          error: 'Invalid email or password.',
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error('Login error:', error);

    return NextResponse.json(
      {
        error: 'Invalid email or password.',
      },
      {
        status: 401,
      },
    );
  }
}