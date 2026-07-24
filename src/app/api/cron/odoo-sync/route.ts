import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Revalidates the cache for the home route, ensuring it fetches latest data
    revalidatePath('/');
    return NextResponse.json({ success: true, revalidated: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
