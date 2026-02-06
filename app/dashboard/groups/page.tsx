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
import { FolderTree, Plus, Pencil, Trash2, ChevronRight, Folder, FolderOpen } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description?: string;
  color: string;
  parentId?: string | null;
  parent?: {
    id: string;
    name: string;
    color: string;
  } | null;
  children?: {
    id: string;
    name: string;
    color: string;
  }[];
  _count?: {
    cameras: number;
    children: number;
  };
}

export default function GroupsManagementPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    parentId: '' as string | null,
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get only parent groups (groups without parent) for select
  const parentGroups = groups.filter(g => !g.parentId);
  
  // Get hierarchical structure
  const getGroupedData = () => {
    const parentGroupsList = groups.filter(g => !g.parentId);
    const subgroups = groups.filter(g => g.parentId);
    
    return parentGroupsList.map(parent => ({
      ...parent,
      subgroups: subgroups.filter(sub => sub.parentId === parent.id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingGroup ? `/api/groups/${editingGroup.id}` : '/api/groups';
      const method = editingGroup ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        parentId: formData.parentId || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsOpen(false);
        setEditingGroup(null);
        resetForm();
        fetchGroups();
      } else {
        const data = await res.json();
        alert(data?.error || 'Failed to save group');
      }
    } catch (error) {
      console.error('Save group error:', error);
      alert('Failed to save group');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus group ini?')) return;

    try {
      const res = await fetch(`/api/groups/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchGroups();
      } else {
        const data = await res.json();
        alert(data?.error || 'Failed to delete group');
      }
    } catch (error) {
      console.error('Delete group error:', error);
      alert('Failed to delete group');
    }
  };

  const openEditDialog = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color,
      parentId: group.parentId || '',
    });
    setIsOpen(true);
  };

  const openAddDialog = (parentId?: string) => {
    setEditingGroup(null);
    resetForm();
    if (parentId) {
      setFormData(prev => ({ ...prev, parentId }));
    }
    setIsOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      parentId: '',
    });
  };

  // Check if a group can be a parent (must not be a subgroup itself)
  const canBeParent = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group && !group.parentId;
  };

  // Get available parents for select (exclude current group and subgroups)
  const getAvailableParents = () => {
    return groups.filter(g => {
      // Must be a parent group (no parentId)
      if (g.parentId) return false;
      // Exclude current editing group
      if (editingGroup && g.id === editingGroup.id) return false;
      return true;
    });
  };

  const colorPresets = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // orange
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
  ];

  const groupedData = getGroupedData();

  // Check if editing group has children (can't change to subgroup)
  const editingGroupHasChildren = !!(editingGroup && (editingGroup._count?.children ?? 0) > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Groups Management</h2>
          <p className="text-slate-400">Kelola group kamera dengan struktur parent dan subgroup</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openAddDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? 'Edit Group' : 'Tambah Group Baru'}
              </DialogTitle>
              <DialogDescription>
                {editingGroup
                  ? 'Update informasi group'
                  : 'Buat group kamera baru (bisa sebagai parent atau subgroup)'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Group *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="contoh: Lantai 1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentId">Parent Group</Label>
                  <Select
                    value={formData.parentId || 'no-parent'}
                    onValueChange={(value) => setFormData({ ...formData, parentId: value === 'no-parent' ? '' : value })}
                    disabled={editingGroupHasChildren}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih parent group (opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-parent">
                        <span className="text-slate-400">-- Tanpa Parent (Top Level) --</span>
                      </SelectItem>
                      {getAvailableParents().map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: group.color }}
                            />
                            {group.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editingGroupHasChildren && (
                    <p className="text-xs text-amber-400">
                      Group ini memiliki subgroup, tidak bisa dijadikan subgroup
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    Pilih parent jika ingin menjadikan group ini sebagai subgroup
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Deskripsi group"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Warna</Label>
                  <div className="flex gap-2">
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          formData.color === color
                            ? 'border-white scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit">
                  {editingGroup ? 'Update' : 'Tambah'} Group
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Semua Group
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 mx-auto"></div>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12">
              <FolderTree className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Belum ada group yang dibuat</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedData.map((parentGroup) => (
                <div key={parentGroup.id} className="space-y-2">
                  {/* Parent Group */}
                  <div className="p-4 rounded-lg bg-slate-800 hover:bg-slate-750 transition-colors border border-slate-700">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <FolderOpen 
                          className="h-5 w-5" 
                          style={{ color: parentGroup.color }} 
                        />
                        <div>
                          <h3 className="text-sm font-semibold text-white">{parentGroup.name}</h3>
                          {parentGroup.description && (
                            <p className="text-xs text-slate-400">{parentGroup.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {parentGroup._count?.cameras || 0} kamera
                        </Badge>
                        {(parentGroup._count?.children ?? 0) > 0 && (
                          <Badge variant="outline" className="text-blue-400 border-blue-400">
                            {parentGroup._count?.children} subgroup
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAddDialog(parentGroup.id)}
                        title="Tambah Subgroup"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Subgroup
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(parentGroup)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(parentGroup.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Subgroups */}
                  {parentGroup.subgroups && parentGroup.subgroups.length > 0 && (
                    <div className="ml-6 space-y-2">
                      {parentGroup.subgroups.map((subgroup) => (
                        <div
                          key={subgroup.id}
                          className="p-3 rounded-lg bg-slate-850 hover:bg-slate-800 transition-colors border border-slate-700/50 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <ChevronRight className="h-4 w-4 text-slate-500" />
                            <Folder 
                              className="h-4 w-4" 
                              style={{ color: subgroup.color }} 
                            />
                            <div>
                              <h4 className="text-sm font-medium text-slate-200">{subgroup.name}</h4>
                              {subgroup.description && (
                                <p className="text-xs text-slate-500">{subgroup.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {subgroup._count?.cameras || 0} kamera
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => openEditDialog(subgroup)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleDelete(subgroup.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Ungrouped notice if only subgroups exist without parents */}
              {groupedData.length === 0 && groups.length > 0 && (
                <div className="text-center py-8 text-slate-400">
                  <p>Semua group adalah subgroup tanpa parent</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
