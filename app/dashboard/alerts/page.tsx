'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertCircle, CheckCircle, XCircle, Trash2 } from 'lucide-react';

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  camera?: {
    id: string;
    name: string;
  } | null;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const url =
        filter === 'unread' ? '/api/alerts?isRead=false' : '/api/alerts';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: 'PUT',
      });
      if (res.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/alerts/mark-all-read', {
        method: 'POST',
      });
      if (res.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to mark all alerts as read:', error);
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'CAMERA_OFFLINE':
      case 'RECORDING_FAILED':
      case 'SYSTEM_ERROR':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'CAMERA_ONLINE':
      case 'RECORDING_STOPPED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Alerts</h2>
        <p className="text-slate-400">
          Monitor system notifications and camera alerts
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount} unread</Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Unread
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  Mark All Read
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 mx-auto"></div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">
                {filter === 'unread' ? 'No unread alerts' : 'No alerts available'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-4 rounded-lg transition-colors ${
                    alert.isRead
                      ? 'bg-slate-800 hover:bg-slate-700'
                      : 'bg-blue-900/20 border border-blue-800 hover:bg-blue-900/30'
                  }`}
                >
                  <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-medium text-white">
                        {alert.title}
                      </h3>
                      {!alert.isRead && (
                        <Badge variant="default" className="bg-blue-600 text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{alert.message}</p>
                    {alert.camera && (
                      <p className="text-xs text-slate-500">
                        Camera: {alert.camera.name}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(alert.createdAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!alert.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsRead(alert.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteAlert(alert.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
