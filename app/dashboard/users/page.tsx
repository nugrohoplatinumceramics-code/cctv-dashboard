'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Users, Plus, Pencil, Trash2, Shield, User, PlaySquare, Camera, Video, Eye } from 'lucide-react';

interface UserType {
  id: string;
  name: string;
  email: string;
  role: string;
  canAccessPlayback: boolean;
  createdAt: string;
  _count?: {
    cameraPermissions: number;
  };
}

interface CameraType {
  id: string;
  name: string;
  description?: string;
  group?: { id: string; name: string; color: string } | null;
}

interface CameraPermission {
  id: string;
  cameraId: string;
  camera: CameraType;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    canAccessPlayback: true,
  });

  // Camera permission state
  const [isPermissionOpen, setIsPermissionOpen] = useState(false);
  const [permissionUser, setPermissionUser] = useState<UserType | null>(null);
  const [allCameras, setAllCameras] = useState<CameraType[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [permissionLoading, setPermissionLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchAllCameras();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllCameras = async () => {
    try {
      const res = await fetch('/api/cameras?all=true');
      if (res.ok) {
        const data = await res.json();
        setAllCameras(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch cameras:', error);
    }
  };

  const fetchUserPermissions = async (userId: string) => {
    try {
      setPermissionLoading(true);
      const res = await fetch(`/api/users/${userId}/permissions`);
      if (res.ok) {
        const data = await res.json();
        const cameraIds = data?.map((p: CameraPermission) => p.cameraId) || [];
        setUserPermissions(cameraIds);
      }
    } catch (error) {
      console.error('Failed to fetch user permissions:', error);
    } finally {
      setPermissionLoading(false);
    }
  };

  const openPermissionDialog = async (user: UserType) => {
    setPermissionUser(user);
    setIsPermissionOpen(true);
    await fetchUserPermissions(user.id);
  };

  const handlePermissionChange = async (cameraId: string, checked: boolean) => {
    if (!permissionUser) return;

    try {
      if (checked) {
        // Add permission
        const res = await fetch(`/api/users/${permissionUser.id}/permissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cameraId }),
        });
        if (res.ok) {
          setUserPermissions(prev => [...prev, cameraId]);
        } else {
          const data = await res.json();
          alert(data?.error || 'Failed to add permission');
        }
      } else {
        // Remove permission
        const res = await fetch(`/api/users/${permissionUser.id}/permissions?cameraId=${cameraId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setUserPermissions(prev => prev.filter(id => id !== cameraId));
        } else {
          const data = await res.json();
          alert(data?.error || 'Failed to remove permission');
        }
      }
      fetchUsers();
    } catch (error) {
      console.error('Permission change error:', error);
      alert('Failed to update permission');
    }
  };

  const handleSelectAllCameras = async () => {
    if (!permissionUser) return;
    for (const camera of allCameras) {
      if (!userPermissions.includes(camera.id)) {
        await handlePermissionChange(camera.id, true);
      }
    }
  };

  const handleDeselectAllCameras = async () => {
    if (!permissionUser) return;
    for (const cameraId of userPermissions) {
      await handlePermissionChange(cameraId, false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      // Don't send password if editing and password is empty
      const submitData = { ...formData };
      if (editingUser && !submitData.password) {
        delete (submitData as any).password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        setIsOpen(false);
        setEditingUser(null);
        resetForm();
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data?.error || 'Failed to save user');
      }
    } catch (error) {
      console.error('Save user error:', error);
      alert('Failed to save user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data?.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      alert('Failed to delete user');
    }
  };

  const openEditDialog = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email,
      password: '', // Don't populate password
      role: user.role,
      canAccessPlayback: user.canAccessPlayback ?? true,
    });
    setIsOpen(true);
  };

  const openAddDialog = () => {
    setEditingUser(null);
    resetForm();
    setIsOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'USER',
      canAccessPlayback: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Users Management</h2>
          <p className="text-slate-400">Manage user accounts and permissions</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Edit User' : 'Add New User'}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? 'Update user information and role'
                  : 'Create a new user account'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password {editingUser ? '(leave blank to keep current)' : '*'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password"
                    required={!editingUser}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.role === 'USER' && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <PlaySquare className="h-4 w-4 text-slate-400" />
                        <Label htmlFor="canAccessPlayback" className="text-sm font-medium">
                          Akses Menu Playback
                        </Label>
                      </div>
                      <p className="text-xs text-slate-400">
                        Izinkan user melihat rekaman kamera
                      </p>
                    </div>
                    <Switch
                      id="canAccessPlayback"
                      checked={formData.canAccessPlayback}
                      onCheckedChange={(checked) => setFormData({ ...formData, canAccessPlayback: checked })}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUser ? 'Update' : 'Add'} User
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 mx-auto"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No users found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <div className={`p-3 rounded-lg ${
                    user.role === 'ADMIN' ? 'bg-purple-600/20' : 'bg-blue-600/20'
                  }`}>
                    {user.role === 'ADMIN' ? (
                      <Shield className="h-6 w-6 text-purple-400" />
                    ) : (
                      <User className="h-6 w-6 text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-white">{user.name}</h3>
                      <Badge
                        variant={user.role === 'ADMIN' ? 'default' : 'secondary'}
                        className={user.role === 'ADMIN' ? 'bg-purple-600' : ''}
                      >
                        {user.role}
                      </Badge>
                      {user.role === 'USER' && !user.canAccessPlayback && (
                        <Badge variant="outline" className="text-orange-400 border-orange-400">
                          No Playback
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{user.email}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {user._count?.cameraPermissions || 0} camera permissions
                      {user.role === 'USER' && (
                        <span className="ml-2">
                          • Playback: {user.canAccessPlayback ? '✓' : '✗'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {user.role === 'USER' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPermissionDialog(user)}
                        title="Atur Akses Kamera"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(user.id)}
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

      {/* Camera Permission Dialog */}
      <Dialog open={isPermissionOpen} onOpenChange={setIsPermissionOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Akses Kamera - {permissionUser?.name}
            </DialogTitle>
            <DialogDescription>
              Pilih kamera mana saja yang dapat diakses oleh user ini. Admin dapat melihat semua kamera secara otomatis.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {permissionLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 mx-auto"></div>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  <Button size="sm" variant="outline" onClick={handleSelectAllCameras}>
                    Pilih Semua
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDeselectAllCameras}>
                    Hapus Semua
                  </Button>
                </div>
                <div className="text-sm text-slate-400 mb-3">
                  {userPermissions.length} dari {allCameras.length} kamera dipilih
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {allCameras.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">Belum ada kamera</p>
                  ) : (
                    allCameras.map((camera) => (
                      <div
                        key={camera.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                      >
                        <Checkbox
                          id={`camera-${camera.id}`}
                          checked={userPermissions.includes(camera.id)}
                          onCheckedChange={(checked) => handlePermissionChange(camera.id, checked as boolean)}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <Video className="h-4 w-4 text-blue-400" />
                          <div>
                            <p className="text-sm font-medium text-white">{camera.name}</p>
                            {camera.group && (
                              <p className="text-xs text-slate-400">
                                Group: {camera.group.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={userPermissions.includes(camera.id) ? 'default' : 'secondary'}>
                          {userPermissions.includes(camera.id) ? 'Aktif' : 'Non-aktif'}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
