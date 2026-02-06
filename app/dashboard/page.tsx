import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, AlertCircle, PlaySquare, Camera as CameraIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  // Get statistics
  let totalCameras = 0;
  let onlineCameras = 0;
  let totalRecordings = 0;
  let unreadAlerts = 0;

  if (userRole === 'ADMIN') {
    totalCameras = await prisma.camera.count({ where: { isActive: true } });
    onlineCameras = await prisma.camera.count({ 
      where: { isActive: true, status: 'ONLINE' } 
    });
    totalRecordings = await prisma.recording.count();
    unreadAlerts = await prisma.alert.count({ where: { isRead: false } });
  } else {
    // Regular user stats
    const userCameras = await prisma.userCameraPermission.findMany({
      where: { userId },
      include: { camera: true },
    });
    totalCameras = userCameras.filter((p: any) => p.camera?.isActive).length;
    onlineCameras = userCameras.filter(
      (p: any) => p.camera?.isActive && p.camera?.status === 'ONLINE'
    ).length;
    totalRecordings = await prisma.recording.count({
      where: {
        camera: {
          userPermissions: {
            some: { userId },
          },
        },
      },
    });
    unreadAlerts = await prisma.alert.count({ where: { isRead: false } });
  }

  // Get recent alerts
  const recentAlerts = await prisma.alert.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      camera: {
        select: { name: true },
      },
    },
  });

  const stats = [
    {
      title: 'Total Cameras',
      value: totalCameras,
      icon: CameraIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-600/10',
    },
    {
      title: 'Online Cameras',
      value: onlineCameras,
      icon: Video,
      color: 'text-green-600',
      bgColor: 'bg-green-600/10',
    },
    {
      title: 'Total Recordings',
      value: totalRecordings,
      icon: PlaySquare,
      color: 'text-purple-600',
      bgColor: 'bg-purple-600/10',
    },
    {
      title: 'Unread Alerts',
      value: unreadAlerts,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-600/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Welcome back, {session?.user?.name || 'User'}!
        </h2>
        <p className="text-slate-400">
          Monitor your CCTV cameras in real-time and manage your security system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/dashboard/live">
              <Button className="w-full" variant="outline">
                <Video className="mr-2 h-4 w-4" />
                View Live Cameras
              </Button>
            </Link>
            <Link href="/dashboard/playback">
              <Button className="w-full" variant="outline">
                <PlaySquare className="mr-2 h-4 w-4" />
                View Recordings
              </Button>
            </Link>
            {userRole === 'ADMIN' && (
              <Link href="/dashboard/cameras">
                <Button className="w-full" variant="outline">
                  <CameraIcon className="mr-2 h-4 w-4" />
                  Manage Cameras
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAlerts?.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No alerts yet</p>
          ) : (
            <div className="space-y-3">
              {recentAlerts?.map((alert: any) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{alert.title}</p>
                    <p className="text-xs text-slate-400">{alert.message}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(alert.createdAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/dashboard/alerts" className="block mt-4">
            <Button variant="link" className="w-full">
              View All Alerts
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
