import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import prisma from './db';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if ((user as any)?.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }
  return user;
}

export async function checkCameraAccess(userId: string, cameraId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return false;
  
  // Admin has access to all cameras
  if (user.role === 'ADMIN') return true;

  // Check if user has permission to this camera
  const permission = await prisma.userCameraPermission.findFirst({
    where: {
      userId,
      cameraId,
    },
  });

  if (permission) return true;

  const camera = await prisma.camera.findUnique({
    where: { id: cameraId },
    select: { groupId: true },
  });

  if (!camera?.groupId) return false;

  const groupPermissions = await prisma.userCameraGroupPermission.findMany({
    where: { userId },
    select: { groupId: true },
  });
  if (groupPermissions.length === 0) return false;

  const allowedGroupIds = new Set(groupPermissions.map((p) => p.groupId));
  if (allowedGroupIds.has(camera.groupId)) return true;

  const groups = await prisma.cameraGroup.findMany({
    select: { id: true, parentId: true },
  });
  const groupMap = new Map(groups.map((g) => [g.id, g.parentId]));

  let currentParentId = groupMap.get(camera.groupId);
  while (currentParentId) {
    if (allowedGroupIds.has(currentParentId)) return true;
    currentParentId = groupMap.get(currentParentId) || null;
  }

  return false;
}

export async function getUserAccessibleCameras(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return [];

  // Admin can see all cameras
  if (user.role === 'ADMIN') {
    return await prisma.camera.findMany({
      where: { isActive: true },
      include: { group: true },
      orderBy: [{ groupId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    });
  }

  // Regular user can only see cameras they have permission to
  const [cameraPermissions, groupPermissions] = await Promise.all([
    prisma.userCameraPermission.findMany({
      where: { userId },
      select: { cameraId: true },
    }),
    prisma.userCameraGroupPermission.findMany({
      where: { userId },
      select: { groupId: true },
    }),
  ]);

  const allowedCameraIds = cameraPermissions.map((p) => p.cameraId);
  const allowedGroupIds = new Set(groupPermissions.map((p) => p.groupId));

  if (allowedGroupIds.size > 0) {
    const groups = await prisma.cameraGroup.findMany({
      select: { id: true, parentId: true },
    });
    const childrenMap = new Map<string, string[]>();

    for (const group of groups) {
      if (!group.parentId) continue;
      const children = childrenMap.get(group.parentId) || [];
      children.push(group.id);
      childrenMap.set(group.parentId, children);
    }

    const queue = Array.from(allowedGroupIds);
    while (queue.length > 0) {
      const currentGroupId = queue.shift()!;
      const childIds = childrenMap.get(currentGroupId) || [];
      for (const childId of childIds) {
        if (!allowedGroupIds.has(childId)) {
          allowedGroupIds.add(childId);
          queue.push(childId);
        }
      }
    }
  }

  if (allowedCameraIds.length === 0 && allowedGroupIds.size === 0) {
    return [];
  }

  return await prisma.camera.findMany({
    where: {
      isActive: true,
      OR: [
        ...(allowedCameraIds.length > 0 ? [{ id: { in: allowedCameraIds } }] : []),
        ...(allowedGroupIds.size > 0 ? [{ groupId: { in: Array.from(allowedGroupIds) } }] : []),
      ],
    },
    include: { group: true },
    orderBy: [{ groupId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
  });
}
