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

  return !!permission;
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
  const permissions = await prisma.userCameraPermission.findMany({
    where: {
      userId,
      camera: {
        isActive: true,
      },
    },
    include: {
      camera: {
        include: { group: true },
      },
    },
  });

  return permissions.map((p: any) => p.camera).filter((c: any) => c !== null);
}
