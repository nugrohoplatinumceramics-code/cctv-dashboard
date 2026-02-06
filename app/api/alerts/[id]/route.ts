import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// PUT mark alert as read
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = params;

    const alert = await prisma.alert.update({
      where: { id },
      data: {
        isRead: true,
        acknowledgedBy: (user as any)?.id,
        acknowledgedAt: new Date(),
      },
    });

    return NextResponse.json(alert);
  } catch (error: any) {
    console.error('Mark alert as read error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to mark alert as read' },
      { status: 500 }
    );
  }
}

// DELETE alert
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const { id } = params;

    await prisma.alert.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Alert deleted successfully' });
  } catch (error: any) {
    console.error('Delete alert error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete alert' },
      { status: 500 }
    );
  }
}
