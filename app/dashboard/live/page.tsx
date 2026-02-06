import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserAccessibleCameras } from '@/lib/auth-helpers';
import { LiveCameraGrid } from './_components/live-camera-grid';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function LiveViewPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  const userId = (session?.user as any)?.id;
  const cameras = await getUserAccessibleCameras(userId);
  
  // Get all groups
  const groups = await prisma.cameraGroup.findMany({
    orderBy: { order: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Live View</h2>
        <p className="text-slate-400">
          Monitor all your cameras in real-time
        </p>
      </div>

      <LiveCameraGrid cameras={cameras} groups={groups} />
    </div>
  );
}
