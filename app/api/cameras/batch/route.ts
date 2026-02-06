import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

interface CameraInput {
  name: string;
  rtspUrl: string;
  subRtspUrl?: string;
  description?: string;
  groupId?: string;
}

// POST batch create cameras (admin only)
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { cameras, groupId } = body as { cameras: CameraInput[]; groupId?: string };

    if (!cameras || !Array.isArray(cameras) || cameras.length === 0) {
      return NextResponse.json(
        { error: 'Cameras array is required' },
        { status: 400 }
      );
    }

    // Validate each camera
    const errors: string[] = [];
    cameras.forEach((cam, index) => {
      if (!cam.name || !cam.rtspUrl) {
        errors.push(`Row ${index + 1}: Name and URL are required`);
      }
    });

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    // Create cameras
    const createdCameras = await prisma.$transaction(
      cameras.map((cam) =>
        prisma.camera.create({
          data: {
            name: cam.name.trim(),
            rtspUrl: cam.rtspUrl.trim(),
            subRtspUrl: cam.subRtspUrl?.trim() || null,
            description: cam.description?.trim() || null,
            groupId: cam.groupId || groupId || null,
            status: 'OFFLINE',
            recordingEnabled: false,
          },
        })
      )
    );

    return NextResponse.json(
      {
        message: `Successfully created ${createdCameras.length} cameras`,
        cameras: createdCameras,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Batch create cameras error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create cameras' },
      { status: error?.message?.includes('Admin') ? 403 : 500 }
    );
  }
}
