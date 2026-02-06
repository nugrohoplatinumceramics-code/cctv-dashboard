import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireAdmin, getUserAccessibleCameras } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET all cameras (filtered by user permissions, or all for admin)
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');
    const all = searchParams.get('all');

    // If admin requests all cameras (for permission management)
    if (all === 'true' && (user as any).role === 'ADMIN') {
      const allCameras = await prisma.camera.findMany({
        include: {
          group: {
            select: { id: true, name: true, color: true },
          },
        },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(allCameras);
    }

    const cameras = await getUserAccessibleCameras((user as any).id);

    // Filter by group if specified
    const filteredCameras = groupId
      ? cameras.filter((c: any) => c.groupId === groupId)
      : cameras;

    return NextResponse.json(filteredCameras);
  } catch (error: any) {
    console.error('Get cameras error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch cameras' },
      { status: error?.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

// POST create new camera (admin only)
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { name, rtspUrl, subRtspUrl, description, groupId, recordingEnabled } = body;

    if (!name || !rtspUrl) {
      return NextResponse.json(
        { error: 'Name and RTSP URL are required' },
        { status: 400 }
      );
    }

    const camera = await prisma.camera.create({
      data: {
        name,
        rtspUrl,
        description,
        subRtspUrl: subRtspUrl || null,
        groupId: groupId || null,
        recordingEnabled: recordingEnabled || false,
        status: 'OFFLINE',
      },
      include: { group: true },
    });

    return NextResponse.json(camera, { status: 201 });
  } catch (error: any) {
    console.error('Create camera error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create camera' },
      { status: error?.message?.includes('Admin') ? 403 : 500 }
    );
  }
}
