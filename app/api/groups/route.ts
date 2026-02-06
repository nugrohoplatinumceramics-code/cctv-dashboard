import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET all groups with hierarchy
export async function GET() {
  try {
    await requireAuth();
    
    const groups = await prisma.cameraGroup.findMany({
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
      include: {
        parent: {
          select: { id: true, name: true, color: true },
        },
        children: {
          select: { id: true, name: true, color: true },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { cameras: true, children: true },
        },
      },
    });

    return NextResponse.json(groups);
  } catch (error: any) {
    console.error('Get groups error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

// POST create new group (admin only)
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { name, description, color, parentId } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Validate parentId if provided
    if (parentId) {
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

      // Prevent nesting more than 1 level (parent group cannot have a parent)
      if (parentGroup.parentId) {
        return NextResponse.json(
          { error: 'Subgroup tidak bisa memiliki subgroup lagi (maksimal 1 level)' },
          { status: 400 }
        );
      }
    }

    const group = await prisma.cameraGroup.create({
      data: {
        name,
        description,
        color: color || '#3B82F6',
        parentId: parentId || null,
      },
      include: {
        parent: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error: any) {
    console.error('Create group error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create group' },
      { status: 500 }
    );
  }
}
