import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlaySquare, Clock, HardDrive, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PlaybackPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  // Get recordings based on user role
  let recordings;
  if (userRole === 'ADMIN') {
    recordings = await prisma.recording.findMany({
      take: 50,
      orderBy: { startTime: 'desc' },
      include: {
        camera: {
          select: {
            id: true,
            name: true,
            group: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  } else {
    // Regular user can only see recordings from their accessible cameras
    const userCameras = await prisma.userCameraPermission.findMany({
      where: { userId },
      select: { cameraId: true },
    });
    const cameraIds = userCameras.map((p: any) => p.cameraId);

    recordings = await prisma.recording.findMany({
      where: {
        cameraId: { in: cameraIds },
      },
      take: 50,
      orderBy: { startTime: 'desc' },
      include: {
        camera: {
          select: {
            id: true,
            name: true,
            group: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const formatFileSize = (bytes: bigint | null) => {
    if (!bytes) return 'N/A';
    const mb = Number(bytes) / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Playback</h2>
        <p className="text-slate-400">
          View and manage recorded footage from your cameras
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <PlaySquare className="h-5 w-5" />
            Recent Recordings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recordings?.length === 0 ? (
            <div className="text-center py-12">
              <PlaySquare className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No recordings available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recordings?.map((recording: any) => (
                <div
                  key={recording.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <div className="p-3 rounded-lg bg-purple-600/20">
                    <PlaySquare className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-medium text-white">
                          {recording.camera?.name || 'Unknown Camera'}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {recording.camera?.group?.name || 'No Group'}
                        </p>
                      </div>
                      <Badge
                        variant={recording.status === 'COMPLETED' ? 'default' : 'secondary'}
                        className={
                          recording.status === 'COMPLETED'
                            ? 'bg-green-600'
                            : recording.status === 'RECORDING'
                            ? 'bg-blue-600'
                            : recording.status === 'FAILED'
                            ? 'bg-red-600'
                            : ''
                        }
                      >
                        {recording.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(recording.startTime).toLocaleDateString('id-ID')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(recording.startTime).toLocaleTimeString('id-ID')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <PlaySquare className="h-3 w-3" />
                        <span>{formatDuration(recording.duration)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <HardDrive className="h-3 w-3" />
                        <span>{formatFileSize(recording.fileSize)}</span>
                      </div>
                    </div>

                    {recording.user && (
                      <p className="text-xs text-slate-500 mt-2">
                        Recorded by: {recording.user.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
