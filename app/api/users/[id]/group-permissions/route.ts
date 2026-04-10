import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET user's group permissions
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id } = params;

    const permissions = await prisma.userCameraGroupPermission.findMany({
      where: { userId: id },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            color: true,
            parentId: true,
          },
        },
      },
    });

    return NextResponse.json(permissions);
  } catch (error: any) {
    console.error('Get group permissions error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch group permissions' },
      { status: 500 }
    );
  }
}

// POST grant group permission to user
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id: userId } = params;
    const body = await req.json();
    const { groupId } = body;

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    const existing = await prisma.userCameraGroupPermission.findFirst({
      where: { userId, groupId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Group permission already exists' },
        { status: 400 }
      );
    }

    const permission = await prisma.userCameraGroupPermission.create({
      data: {
        userId,
        groupId,
      },
      include: {
        group: true,
      },
    });

    return NextResponse.json(permission, { status: 201 });
  } catch (error: any) {
    console.error('Grant group permission error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to grant group permission' },
      { status: 500 }
    );
  }
}

// DELETE revoke group permission
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id: userId } = params;
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    await prisma.userCameraGroupPermission.deleteMany({
      where: {
        userId,
        groupId,
      },
    });

    return NextResponse.json({ message: 'Group permission revoked successfully' });
  } catch (error: any) {
    console.error('Revoke group permission error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to revoke group permission' },
      { status: 500 }
    );
  }
}
