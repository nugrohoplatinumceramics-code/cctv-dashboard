import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// POST mark all alerts as read
export async function POST() {
  try {
    const user = await requireAuth();

    await prisma.alert.updateMany({
      where: { isRead: false },
      data: {
        isRead: true,
        acknowledgedBy: (user as any)?.id,
        acknowledgedAt: new Date(),
      },
    });

    return NextResponse.json({ message: 'All alerts marked as read' });
  } catch (error: any) {
    console.error('Mark all alerts as read error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to mark all alerts as read' },
      { status: 500 }
    );
  }
}
