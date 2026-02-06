'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VideoPlayer } from './video-player';
import { Camera, Circle, Filter, ChevronLeft, ChevronRight, Grid2X2, Grid3X3, LayoutGrid, FolderOpen, Folder, Maximize2, X } from 'lucide-react';
import type { Camera as CameraType, CameraGroup } from '@prisma/client';

interface ExtendedCameraGroup extends CameraGroup {
  parent?: { id: string; name: string; color: string } | null;
  children?: { id: string; name: string; color: string }[];
}

interface LiveCameraGridProps {
  cameras: (CameraType & { group: CameraGroup | null })[];
  groups: ExtendedCameraGroup[];
}

type GridLayout = '2x2' | '3x3';

const GRID_CONFIG: Record<GridLayout, { cols: number; total: number; label: string }> = {
  '2x2': { cols: 2, total: 4, label: '2x2 (4 kamera)' },
  '3x3': { cols: 3, total: 9, label: '3x3 (9 kamera)' },
};

export function LiveCameraGrid({ cameras: initialCameras, groups }: LiveCameraGridProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [cameras] = useState(initialCameras);
  const [currentPage, setCurrentPage] = useState(1);
  const [gridLayout, setGridLayout] = useState<GridLayout>('3x3');
  const [expandedCamera, setExpandedCamera] = useState<(CameraType & { group: CameraGroup | null }) | null>(null);

  const camerasPerPage = GRID_CONFIG[gridLayout].total;

  // Get hierarchical groups structure
  const hierarchicalGroups = useMemo(() => {
    const parentGroups = groups.filter(g => !g.parentId);
    const subgroups = groups.filter(g => g.parentId);
    
    return parentGroups.map(parent => ({
      ...parent,
      subgroups: subgroups.filter(sub => sub.parentId === parent.id),
    }));
  }, [groups]);

  // Get all group IDs for a parent (including subgroups)
  const getGroupIdsForFilter = (groupId: string): string[] => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return [groupId];
    
    // If this is a parent group, include all subgroup IDs too
    if (!group.parentId) {
      const subgroupIds = groups
        .filter(g => g.parentId === groupId)
        .map(g => g.id);
      return [groupId, ...subgroupIds];
    }
    
    return [groupId];
  };

  const filteredCameras = useMemo(() => {
    if (selectedGroup === 'all') {
      return cameras;
    }
    
    const groupIds = getGroupIdsForFilter(selectedGroup);
    return cameras.filter((c) => c.groupId && groupIds.includes(c.groupId));
  }, [cameras, selectedGroup, groups]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredCameras.length / camerasPerPage) || 1;
  const startIndex = (currentPage - 1) * camerasPerPage;
  const endIndex = startIndex + camerasPerPage;
  const displayCameras = filteredCameras.slice(startIndex, endIndex);

  // Fill empty slots based on grid layout
  const emptySlots = Math.max(0, camerasPerPage - displayCameras.length);

  // Reset to page 1 when changing group filter or grid layout
  const handleGroupChange = (value: string) => {
    setSelectedGroup(value);
    setCurrentPage(1);
  };

  const handleLayoutChange = (layout: GridLayout) => {
    setGridLayout(layout);
    setCurrentPage(1);
  };

  // Ensure current page is valid when totalPages changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getGridColsClass = () => {
    switch (gridLayout) {
      case '2x2': return 'grid-cols-1 md:grid-cols-2';
      case '3x3': return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      default: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter, Layout & Pagination Controls */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Group Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">Group:</span>
          </div>
          <Select value={selectedGroup} onValueChange={handleGroupChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Pilih group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kamera</SelectItem>
              {hierarchicalGroups.map((parentGroup) => (
                <div key={parentGroup.id}>
                  {/* Parent Group */}
                  <SelectItem value={parentGroup.id}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-3 w-3" style={{ color: parentGroup.color || '#3B82F6' }} />
                      <span className="font-medium">{parentGroup.name}</span>
                      {parentGroup.subgroups && parentGroup.subgroups.length > 0 && (
                        <span className="text-xs text-slate-400">
                          (+{parentGroup.subgroups.length} subgroup)
                        </span>
                      )}
                    </div>
                  </SelectItem>
                  {/* Subgroups */}
                  {parentGroup.subgroups?.map((subgroup) => (
                    <SelectItem key={subgroup.id} value={subgroup.id}>
                      <div className="flex items-center gap-2 pl-4">
                        <Folder className="h-3 w-3" style={{ color: subgroup.color || '#3B82F6' }} />
                        <span>{subgroup.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>

          {/* Grid Layout Selector */}
          <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
            <LayoutGrid className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">Layout:</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={gridLayout === '2x2' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleLayoutChange('2x2')}
              className={`h-8 px-3 ${gridLayout === '2x2' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              title="2x2 Grid (4 kamera)"
            >
              <Grid2X2 className="h-4 w-4 mr-1" />
              2x2
            </Button>
            <Button
              variant={gridLayout === '3x3' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleLayoutChange('3x3')}
              className={`h-8 px-3 ${gridLayout === '3x3' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              title="3x3 Grid (9 kamera)"
            >
              <Grid3X3 className="h-4 w-4 mr-1" />
              3x3
            </Button>
          </div>

          <div className="flex-1"></div>
          
          {/* Info Badge */}
          <Badge variant="outline" className="text-slate-300">
            {filteredCameras.length} kamera total
          </Badge>
        </div>
        
        {/* Pagination Controls - Only show if more cameras than grid can display */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-800">
            <p className="text-sm text-slate-400">
              Menampilkan kamera {startIndex + 1} - {Math.min(endIndex, filteredCameras.length)} dari {filteredCameras.length} kamera
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Sebelumnya
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => goToPage(page)}
                    className={`h-8 w-8 p-0 ${
                      currentPage === page 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : ''
                    }`}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-8"
              >
                Selanjutnya
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Expanded Camera Dialog */}
      <Dialog open={!!expandedCamera} onOpenChange={(open) => !open && setExpandedCamera(null)}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 bg-slate-900 border-slate-800">
          <DialogHeader className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-slate-400" />
                <DialogTitle className="text-white">
                  {expandedCamera?.name}
                </DialogTitle>
                {expandedCamera?.status && (
                  <Badge
                    variant={expandedCamera.status === 'ONLINE' ? 'default' : 'secondary'}
                    className={`text-xs ${
                      expandedCamera.status === 'ONLINE'
                        ? 'bg-green-600 hover:bg-green-700'
                        : expandedCamera.status === 'ERROR'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-slate-600'
                    }`}
                  >
                    <Circle
                      className={`h-2 w-2 mr-1 ${
                        expandedCamera.status === 'ONLINE' ? 'fill-white' : ''
                      }`}
                    />
                    {expandedCamera.status}
                  </Badge>
                )}
              </div>
              {expandedCamera?.group && (
                <span className="text-sm text-slate-400">{expandedCamera.group.name}</span>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 bg-black">
            {expandedCamera && (
              <div className="w-full h-[calc(90vh-80px)]">
                <VideoPlayer camera={expandedCamera} key={`expanded-${expandedCamera.id}`} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dynamic Grid */}
      <div className={`grid ${getGridColsClass()} gap-4`}>
        {displayCameras.map((camera) => (
          <Card 
            key={camera.id} 
            className="bg-slate-900 border-slate-800 overflow-hidden cursor-pointer hover:border-blue-500 transition-colors group"
            onClick={() => setExpandedCamera(camera)}
          >
            <div className="relative aspect-video bg-slate-950">
              <VideoPlayer camera={camera} />
              {/* Expand button overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-blue-600 rounded-full p-3">
                    <Maximize2 className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-slate-400" />
                  <h3 className="text-sm font-medium text-white truncate">
                    {camera.name}
                  </h3>
                </div>
                <Badge
                  variant={camera.status === 'ONLINE' ? 'default' : 'secondary'}
                  className={`text-xs ${
                    camera.status === 'ONLINE'
                      ? 'bg-green-600 hover:bg-green-700'
                      : camera.status === 'ERROR'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-slate-600'
                  }`}
                >
                  <Circle
                    className={`h-2 w-2 mr-1 ${
                      camera.status === 'ONLINE' ? 'fill-white' : ''
                    }`}
                  />
                  {camera.status}
                </Badge>
              </div>
              {camera.group && (
                <p className="text-xs text-slate-400">
                  {camera.group.name}
                </p>
              )}
            </div>
          </Card>
        ))}

        {/* Empty slots */}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <Card
            key={`empty-${index}`}
            className="bg-slate-900 border-slate-800 border-dashed"
          >
            <div className="aspect-video bg-slate-950 flex items-center justify-center">
              <Camera className="h-12 w-12 text-slate-700" />
            </div>
            <div className="p-3">
              <p className="text-sm text-slate-500 text-center">No Camera</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Bottom Page Info */}
      {totalPages > 1 && (
        <Card className="bg-slate-900 border-slate-800 p-3">
          <p className="text-sm text-slate-400 text-center">
            Halaman {currentPage} dari {totalPages} • Layout {gridLayout} ({camerasPerPage} kamera per halaman)
          </p>
        </Card>
      )}
    </div>
  );
}
