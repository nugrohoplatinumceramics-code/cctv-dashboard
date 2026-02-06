import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET single group with hierarchy info
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const group = await prisma.cameraGroup.findUnique({
      where: { id },
      include: {
        cameras: true,
        parent: {
          select: { id: true, name: true, color: true },
        },
        children: {
          include: {
            cameras: true,
            _count: { select: { cameras: true } },
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { cameras: true, children: true },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(group);
  } catch (error: any) {
    console.error('Get group error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch group' },
      { status: 500 }
    );
  }
}

// PUT update group (admin only)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id } = params;
    const body = await req.json();
    const { name, description, color, parentId } = body;

    // Validate parentId if provided
    if (parentId !== undefined && parentId !== null) {
      // Can't set itself as parent
      if (parentId === id) {
        return NextResponse.json(
          { error: 'Group tidak bisa menjadi parent dari dirinya sendiri' },
          { status: 400 }
        );
      }

      const parentGroup = await prisma.cameraGroup.findUnique({
        where: { id: parentId },
        select: { id: true, parentId: true },
      });

      if (!parentGroup) {
        return NextResponse.json(
          { error: 'Parent group not found' },
          { status: 400 }
        );
      }

      // Prevent nesting more than 1 level
      if (parentGroup.parentId) {
        return NextResponse.json(
          { error: 'Subgroup tidak bisa memiliki subgroup lagi (maksimal 1 level)' },
          { status: 400 }
        );
      }

      // Check if this group has children (can't become subgroup if has children)
      const currentGroup = await prisma.cameraGroup.findUnique({
        where: { id },
        include: { _count: { select: { children: true } } },
      });

      if (currentGroup?._count?.children && currentGroup._count.children > 0) {
        return NextResponse.json(
          { error: 'Group yang memiliki subgroup tidak bisa menjadi subgroup' },
          { status: 400 }
        );
      }
    }

    const group = await prisma.cameraGroup.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
      include: {
        parent: {
          select: { id: true, name: true, color: true },
        },
        children: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    return NextResponse.json(group);
  } catch (error: any) {
    console.error('Update group error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update group' },
      { status: 500 }
    );
  }
}

// DELETE group (admin only)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id } = params;

    // Check if group has cameras or children
    const group = await prisma.cameraGroup.findUnique({
      where: { id },
      include: { _count: { select: { cameras: true, children: true } } },
    });

    if (group?._count?.cameras && group._count.cameras > 0) {
      return NextResponse.json(
        { error: 'Tidak bisa menghapus group yang masih memiliki kamera. Pindahkan atau hapus kamera terlebih dahulu.' },
        { status: 400 }
      );
    }

    if (group?._count?.children && group._count.children > 0) {
      return NextResponse.json(
        { error: 'Tidak bisa menghapus group yang masih memiliki subgroup. Hapus subgroup terlebih dahulu.' },
        { status: 400 }
      );
    }

    await prisma.cameraGroup.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error: any) {
    console.error('Delete group error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete group' },
      { status: 500 }
    );
  }
}
