import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, checkCameraAccess } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET start streaming (RTSP to HLS conversion)
export async function GET(
  req: Request,
  { params }: { params: { cameraId: string } }
) {
  try {
    const user = await requireAuth();
    const { cameraId } = params;

    // Check if user has access to this camera
    const hasAccess = await checkCameraAccess((user as any).id, cameraId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get camera details
    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
    });

    if (!camera) {
      return NextResponse.json(
        { error: 'Camera not found' },
        { status: 404 }
      );
    }

    // In a real implementation, this would:
    // 1. Start FFmpeg process to convert RTSP to HLS
    // 2. Save HLS segments to public/streams/[cameraId]/
    // 3. Return the HLS playlist URL
    
    // For now, return the stream info
    return NextResponse.json({
      cameraId: camera.id,
      cameraName: camera.name,
      rtspUrl: camera.rtspUrl,
      status: camera.status,
      // HLS playlist URL would be: /streams/${cameraId}/playlist.m3u8
      hlsUrl: `/streams/${cameraId}/playlist.m3u8`,
      message: 'Stream endpoint ready. HLS conversion pending implementation.',
    });
  } catch (error: any) {
    console.error('Stream error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to start stream' },
      { status: 500 }
    );
  }
}

// POST update camera status
export async function POST(
  req: Request,
  { params }: { params: { cameraId: string } }
) {
  try {
    const user = await requireAuth();
    const { cameraId } = params;
    const body = await req.json();
    const { status } = body;

    const hasAccess = await checkCameraAccess((user as any).id, cameraId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const camera = await prisma.camera.update({
      where: { id: cameraId },
      data: {
        status: status || 'ONLINE',
        lastOnline: new Date(),
      },
    });

    return NextResponse.json(camera);
  } catch (error: any) {
    console.error('Update stream status error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update stream status' },
      { status: 500 }
    );
  }
}
