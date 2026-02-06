'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { Camera, Plus, Pencil, Trash2, Circle, Upload, FileText, Download, FolderOpen, Folder } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Camera {
  id: string;
  name: string;
  rtspUrl: string;
  description?: string;
  groupId?: string;
  status: string;
  isActive: boolean;
  recordingEnabled: boolean;
  group?: { id: string; name: string; color: string } | null;
}

interface Group {
  id: string;
  name: string;
  color: string;
  parentId?: string | null;
  parent?: { id: string; name: string; color: string } | null;
}

export default function CamerasManagementPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rtspUrl: '',
    description: '',
    groupId: '',
    recordingEnabled: false,
  });

  // Batch upload state
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchGroupId, setBatchGroupId] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchPreview, setBatchPreview] = useState<{ name: string; url: string }[]>([]);

  const router = useRouter();

  useEffect(() => {
    fetchCameras();
    fetchGroups();
  }, []);

  const fetchCameras = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/cameras');
      if (res.ok) {
        const data = await res.json();
        setCameras(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch cameras:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  // Get hierarchical groups structure
  const getHierarchicalGroups = () => {
    const parentGroups = groups.filter(g => !g.parentId);
    const subgroups = groups.filter(g => g.parentId);
    
    return parentGroups.map(parent => ({
      ...parent,
      subgroups: subgroups.filter(sub => sub.parentId === parent.id),
    }));
  };

  const hierarchicalGroups = getHierarchicalGroups();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCamera ? `/api/cameras/${editingCamera.id}` : '/api/cameras';
      const method = editingCamera ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsOpen(false);
        setEditingCamera(null);
        resetForm();
        fetchCameras();
      } else {
        const data = await res.json();
        alert(data?.error || 'Failed to save camera');
      }
    } catch (error) {
      console.error('Save camera error:', error);
      alert('Failed to save camera');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this camera?')) return;

    try {
      const res = await fetch(`/api/cameras/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchCameras();
      } else {
        const data = await res.json();
        alert(data?.error || 'Failed to delete camera');
      }
    } catch (error) {
      console.error('Delete camera error:', error);
      alert('Failed to delete camera');
    }
  };

  const openEditDialog = (camera: Camera) => {
    setEditingCamera(camera);
    setFormData({
      name: camera.name,
      rtspUrl: camera.rtspUrl,
      description: camera.description || '',
      groupId: camera.groupId || '',
      recordingEnabled: camera.recordingEnabled,
    });
    setIsOpen(true);
  };

  const openAddDialog = () => {
    setEditingCamera(null);
    resetForm();
    setIsOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      rtspUrl: '',
      description: '',
      groupId: '',
      recordingEnabled: false,
    });
  };

  // Parse batch text to preview
  const parseBatchText = (text: string) => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const parsed: { name: string; url: string }[] = [];
    
    for (const line of lines) {
      // Support formats: "name,url" or "name;url" or "name\turl"
      const parts = line.split(/[,;\t]/).map(p => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        parsed.push({ name: parts[0], url: parts[1] });
      }
    }
    
    return parsed;
  };

  const handleBatchTextChange = (text: string) => {
    setBatchText(text);
    setBatchPreview(parseBatchText(text));
  };

  const handleBatchUpload = async () => {
    if (batchPreview.length === 0) {
      alert('Tidak ada kamera yang valid untuk diupload');
      return;
    }

    setBatchLoading(true);
    try {
      const res = await fetch('/api/cameras/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cameras: batchPreview.map(cam => ({
            name: cam.name,
            rtspUrl: cam.url,
          })),
          groupId: batchGroupId === 'no-group' ? null : batchGroupId || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Batch upload berhasil');
        setIsBatchOpen(false);
        setBatchText('');
        setBatchPreview([]);
        setBatchGroupId('');
        fetchCameras();
      } else {
        const data = await res.json();
        alert(data?.error || 'Batch upload gagal');
      }
    } catch (error) {
      console.error('Batch upload error:', error);
      alert('Batch upload gagal');
    } finally {
      setBatchLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `Camera 1,rtsp://username:password@192.168.1.100:554/stream1
Camera 2,rtsp://username:password@192.168.1.101:554/stream1
Camera 3,rtmp://live.server.com/live/stream1
Camera 4,http://server.com/hls/stream.m3u8`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'camera_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Cameras Management</h2>
          <p className="text-slate-400">Manage CCTV cameras and their configurations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBatchOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Batch Upload
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Camera
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingCamera ? 'Edit Camera' : 'Add New Camera'}
              </DialogTitle>
              <DialogDescription>
                {editingCamera
                  ? 'Update camera information and settings'
                  : 'Add a new camera to your surveillance system'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Camera Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Lobby Camera 1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rtspUrl">RTSP URL *</Label>
                  <Input
                    id="rtspUrl"
                    value={formData.rtspUrl}
                    onChange={(e) => setFormData({ ...formData, rtspUrl: e.target.value })}
                    placeholder="rtsp://username:password@host:554/stream"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Camera description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="groupId">Group</Label>
                  <Select
                    value={formData.groupId || 'no-group'}
                    onValueChange={(value) => setFormData({ ...formData, groupId: value === 'no-group' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-group">Tanpa Group</SelectItem>
                      {hierarchicalGroups.map((parentGroup) => (
                        <div key={parentGroup.id}>
                          <SelectItem value={parentGroup.id}>
                            <div className="flex items-center gap-2">
                              <FolderOpen className="h-3 w-3" style={{ color: parentGroup.color }} />
                              <span className="font-medium">{parentGroup.name}</span>
                            </div>
                          </SelectItem>
                          {parentGroup.subgroups?.map((subgroup) => (
                            <SelectItem key={subgroup.id} value={subgroup.id}>
                              <div className="flex items-center gap-2 pl-4">
                                <Folder className="h-3 w-3" style={{ color: subgroup.color }} />
                                <span>{subgroup.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="recordingEnabled"
                    checked={formData.recordingEnabled}
                    onChange={(e) => setFormData({ ...formData, recordingEnabled: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="recordingEnabled">Enable Recording</Label>
                </div>
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
                  {editingCamera ? 'Update' : 'Add'} Camera
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Batch Upload Dialog */}
      <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Batch Upload Kamera
            </DialogTitle>
            <DialogDescription>
              Upload banyak kamera sekaligus dengan format CSV (nama,url). Setiap baris satu kamera.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label>Group (Opsional)</Label>
              <Select
                value={batchGroupId || 'no-group'}
                onValueChange={(value) => setBatchGroupId(value === 'no-group' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-group">Tanpa Group</SelectItem>
                  {hierarchicalGroups.map((parentGroup) => (
                    <div key={parentGroup.id}>
                      <SelectItem value={parentGroup.id}>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-3 w-3" style={{ color: parentGroup.color }} />
                          <span className="font-medium">{parentGroup.name}</span>
                        </div>
                      </SelectItem>
                      {parentGroup.subgroups?.map((subgroup) => (
                        <SelectItem key={subgroup.id} value={subgroup.id}>
                          <div className="flex items-center gap-2 pl-4">
                            <Folder className="h-3 w-3" style={{ color: subgroup.color }} />
                            <span>{subgroup.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Kamera (CSV Format)</Label>
              <Textarea
                value={batchText}
                onChange={(e) => handleBatchTextChange(e.target.value)}
                placeholder={`Nama Kamera 1,rtsp://192.168.1.100:554/stream
Nama Kamera 2,rtsp://192.168.1.101:554/stream
Nama Kamera 3,rtmp://live.server.com/stream`}
                className="min-h-[150px] font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                Format: NamaKamera,URL (pisahkan dengan koma, titik koma, atau tab)
              </p>
            </div>

            {batchPreview.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Preview ({batchPreview.length} kamera)
                </Label>
                <div className="max-h-[200px] overflow-y-auto border border-slate-700 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800 sticky top-0">
                      <tr>
                        <th className="text-left p-2 text-slate-300">#</th>
                        <th className="text-left p-2 text-slate-300">Nama</th>
                        <th className="text-left p-2 text-slate-300">URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchPreview.map((cam, index) => (
                        <tr key={index} className="border-t border-slate-700">
                          <td className="p-2 text-slate-400">{index + 1}</td>
                          <td className="p-2 text-white">{cam.name}</td>
                          <td className="p-2 text-slate-400 font-mono text-xs truncate max-w-[200px]">
                            {cam.url}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleBatchUpload} 
              disabled={batchLoading || batchPreview.length === 0}
            >
              {batchLoading ? 'Uploading...' : `Upload ${batchPreview.length} Kamera`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">All Cameras</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 mx-auto"></div>
            </div>
          ) : cameras.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No cameras configured yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cameras.map((camera) => (
                <div
                  key={camera.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <div className="p-3 rounded-lg bg-blue-600/20">
                    <Camera className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-white">{camera.name}</h3>
                      <Badge
                        variant={camera.status === 'ONLINE' ? 'default' : 'secondary'}
                        className={`text-xs ${
                          camera.status === 'ONLINE'
                            ? 'bg-green-600'
                            : camera.status === 'ERROR'
                            ? 'bg-red-600'
                            : 'bg-slate-600'
                        }`}
                      >
                        <Circle className="h-2 w-2 mr-1 fill-white" />
                        {camera.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">{camera.description}</p>
                    {camera.group && (
                      <p className="text-xs text-slate-500 mt-1">Group: {camera.group.name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(camera)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(camera.id)}
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
