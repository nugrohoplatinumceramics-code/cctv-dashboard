import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET all alerts
export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const isRead = searchParams.get('isRead');
    const limit = parseInt(searchParams.get('limit') || '50');

    let whereClause: any = {};
    if (isRead !== null) {
      whereClause.isRead = isRead === 'true';
    }

    const alerts = await prisma.alert.findMany({
      where: whereClause,
      include: {
        camera: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(alerts);
  } catch (error: any) {
    console.error('Get alerts error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

// POST create alert
export async function POST(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const { type, cameraId, title, message } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Type, title, and message are required' },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.create({
      data: {
        type,
        cameraId: cameraId || null,
        title,
        message,
      },
      include: {
        camera: true,
      },
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (error: any) {
    console.error('Create alert error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create alert' },
      { status: 500 }
    );
  }
}
