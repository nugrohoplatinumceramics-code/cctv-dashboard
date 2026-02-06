'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Video as VideoIcon, AlertCircle, RefreshCw, Play, Volume2, VolumeX } from 'lucide-react';
import type { Camera as CameraType } from '@prisma/client';
import Hls from 'hls.js';

type CameraWithStreams = CameraType & { subRtspUrl?: string | null };

interface VideoPlayerProps {
  camera: CameraWithStreams;
  streamMode?: 'sub' | 'main';
  paused?: boolean;
}

// Detect stream type from URL
function getStreamType(url: string): 'hls' | 'rtmp' | 'rtsp' | 'direct' | 'unknown' {
  const lowerUrl = url.toLowerCase();
  
  // HLS detection - check for .m3u8 anywhere in URL (including query params)
  if (lowerUrl.includes('.m3u8') || lowerUrl.includes('/hls/')) return 'hls';
  
  // Go2RTC and MediaMTX stream endpoints
  if (lowerUrl.includes('/api/stream') || lowerUrl.includes('/api/ws')) return 'hls';
  if (lowerUrl.includes(':8888/') || lowerUrl.includes(':1984/')) return 'hls';
  
  // Direct protocols
  if (lowerUrl.startsWith('rtmp://')) return 'rtmp';
  if (lowerUrl.startsWith('rtsp://')) return 'rtsp';
  
  // Direct video files
  if (lowerUrl.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)) return 'direct';
  
  // HTTP URLs - try as HLS first
  if (lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://')) return 'hls';
  
  return 'unknown';
}

export function VideoPlayer({ camera, streamMode = 'sub', paused = false }: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const loadingRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  const streamUrl = streamMode === 'sub' && camera.subRtspUrl ? camera.subRtspUrl : camera.rtspUrl;
  const streamType = getStreamType(streamUrl);

  const stopCurrentStream = useCallback((video: HTMLVideoElement) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    video.pause();
    video.removeAttribute('src');
    video.load();

    loadingRef.current = false;
    setIsLoading(false);
    setIsPlaying(false);
  }, []);

  // Ref callback to capture video element when it mounts
  const videoRefCallback = useCallback((node: HTMLVideoElement | null) => {
    if (node) {
      console.log(`[VideoPlayer] Video element mounted for: ${camera.name}`);
      setVideoElement(node);
    }
  }, [camera.name]);

  const initializeStream = useCallback((video: HTMLVideoElement) => {
    console.log(`[VideoPlayer] initializeStream called for: ${camera.name}`);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsLoading(true);
    loadingRef.current = true;
    setError(null);


    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    console.log(`[VideoPlayer] Camera: ${camera.name}, Mode: ${streamMode}, URL: ${streamUrl}, Type: ${streamType}`);

    // Timeout untuk loading - jika 15 detik tidak ada response, tampilkan error
    timeoutRef.current = setTimeout(() => {
      if (loadingRef.current) {
        loadingRef.current = false;
        setIsLoading(false);
        setError('Timeout - Stream tidak merespons dalam 15 detik');
        console.log(`[VideoPlayer] Timeout for camera: ${camera.name}`);
        fetch(`/api/cameras/${camera.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ERROR' }),
        }).catch(() => {});
      }
    }, 15000);

    // HLS Stream
    if (streamType === 'hls' || streamUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        const isSubStreamMode = streamMode === 'sub';
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: isSubStreamMode ? 12 : 60,
          manifestLoadingTimeOut: isSubStreamMode ? 5000 : 10000,
          manifestLoadingMaxRetry: isSubStreamMode ? 1 : 2,
          levelLoadingTimeOut: isSubStreamMode ? 5000 : 10000,
          levelLoadingMaxRetry: isSubStreamMode ? 1 : 2,
          fragLoadingTimeOut: isSubStreamMode ? 8000 : 20000,
          fragLoadingMaxRetry: isSubStreamMode ? 1 : 2,
        });
        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          loadingRef.current = false;
          setIsLoading(false);
          video.play().catch(() => {});
          setIsPlaying(true);
          console.log(`[VideoPlayer] Stream loaded successfully: ${camera.name}`);
          // Auto-update status to ONLINE when stream loads
          fetch(`/api/cameras/${camera.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'ONLINE' }),
          }).catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            loadingRef.current = false;
            console.error('HLS Error:', data);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setError('Network error - Stream tidak dapat diakses');
                // Auto-update status to ERROR
                fetch(`/api/cameras/${camera.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'ERROR' }),
                }).catch(() => {});
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                setError('Gagal memuat stream');
                break;
            }
            setIsLoading(false);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS support
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          video.play().catch(() => {});
          setIsPlaying(true);
        });
        video.addEventListener('error', () => {
          setError('Gagal memuat stream');
          setIsLoading(false);
        });
      }
    }
    // Direct video (MP4, WebM, etc)
    else if (streamType === 'direct') {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch(() => {});
        setIsPlaying(true);
      });
      video.addEventListener('error', () => {
        setError('Gagal memuat video');
        setIsLoading(false);
      });
    }
    // RTMP/RTSP - cannot play directly in browser
    else if (streamType === 'rtmp' || streamType === 'rtsp') {
      setIsLoading(false);
      // Don't set error, just show info that proxy is needed
    }
    // Unknown - try direct
    else {
      video.src = streamUrl;
      video.addEventListener('canplay', () => {
        setIsLoading(false);
        video.play().catch(() => {});
        setIsPlaying(true);
      });
      video.addEventListener('error', () => {
        setError('Format stream tidak didukung');
        setIsLoading(false);
      });
    }
  }, [camera.id, camera.name, streamMode, streamType, streamUrl]);

  useEffect(() => {
    // Only initialize when video element is available and not already initialized
    if (!videoElement) {
      console.log(`[VideoPlayer] Waiting for video element: ${camera.name}`);
      return;
    }

    if (paused) {
      stopCurrentStream(videoElement);
      return;
    }

    console.log(`[VideoPlayer] useEffect triggered for: ${camera.name}, videoElement ready`);
    initializedRef.current = true;
    initializeStream(videoElement);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoElement, initializeStream, retryCount, camera.name, paused, stopCurrentStream]);

  useEffect(() => {
    if (!videoElement) return;

    if (paused) {
      stopCurrentStream(videoElement);
      return;
    }

    const streamAlreadyAttached = videoElement.currentSrc || videoElement.src;
    if (!streamAlreadyAttached) {
      initializeStream(videoElement);
      return;
    }

    if (!isLoading && !error) {
      videoElement.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [paused, videoElement, isLoading, error, initializeStream, stopCurrentStream]);

  useEffect(() => {
    if (!videoElement) return;

    if (paused) {
      videoElement.pause();
      setIsPlaying(false);
      return;
    }

    if (!isLoading && !error) {
      videoElement.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [paused, videoElement, isLoading, error]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const handlePlayPause = () => {
    if (!videoElement) return;
    if (isPlaying) {
      videoElement.pause();
    } else {
      videoElement.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleMuteToggle = () => {
    if (!videoElement) return;
    videoElement.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSnapshot = async () => {
    try {
      const res = await fetch('/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameraId: camera.id }),
      });

      if (res.ok) {
        alert('Snapshot captured successfully!');
      } else {
        alert('Failed to capture snapshot');
      }
    } catch (error) {
      console.error('Snapshot error:', error);
      alert('Failed to capture snapshot');
    }
  };

  const handleRecord = async () => {
    try {
      if (!isRecording) {
        const res = await fetch('/api/recordings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cameraId: camera.id }),
        });

        if (res.ok) {
          setIsRecording(true);
        } else {
          const data = await res.json();
          alert(data?.error || 'Failed to start recording');
        }
      } else {
        const recordingsRes = await fetch(`/api/recordings?cameraId=${camera.id}`);
        if (recordingsRes.ok) {
          const recordings = await recordingsRes.json();
          const activeRecording = recordings?.find?.(
            (r: any) => r?.status === 'RECORDING'
          );

          if (activeRecording) {
            const stopRes = await fetch(`/api/recordings/${activeRecording.id}/stop`, {
              method: 'POST',
            });

            if (stopRes.ok) {
              setIsRecording(false);
            }
          }
        }
      }
    } catch (error) {
      console.error('Recording error:', error);
      alert('Failed to manage recording');
    }
  };

  // RTMP/RTSP streams need proxy/conversion
  if ((streamType === 'rtmp' || streamType === 'rtsp') && !error && camera.status !== 'OFFLINE') {
    return (
      <div className="relative w-full h-full group">
        <div className="w-full h-full bg-slate-950 flex items-center justify-center p-4">
          <div className="text-center">
            <VideoIcon className="h-10 w-10 text-blue-500 mx-auto mb-3" />
            <p className="text-sm text-white font-medium mb-1">
              {streamType.toUpperCase()} Stream
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Browser tidak bisa memutar {streamType.toUpperCase()} secara langsung.
            </p>
            <div className="bg-slate-800 rounded p-2 mb-3">
              <p className="text-xs text-slate-300 break-all font-mono">
                {streamUrl}
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Gunakan Media Server (MediaMTX/Nginx-RTMP) untuk konversi ke HLS
            </p>
          </div>
        </div>
        {/* Controls overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-2 left-2 right-2 flex gap-2">
            <Button size="sm" variant="secondary" className="flex-1" onClick={handleSnapshot}>
              <Download className="h-3 w-3 mr-1" />
              Snapshot
            </Button>
            <Button
              size="sm"
              variant={isRecording ? 'destructive' : 'secondary'}
              className="flex-1"
              onClick={handleRecord}
            >
              <div className="flex items-center gap-1">
                {isRecording && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>}
                {isRecording ? 'Stop' : 'Record'}
              </div>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Always render video element, show overlay for loading/error states
  return (
    <div className="relative w-full h-full group bg-black">
      {/* Video element - always rendered so ref callback fires */}
      <video
        ref={videoRefCallback}
        className={`w-full h-full object-contain ${isLoading || error ? 'hidden' : ''}`}
        autoPlay
        muted={isMuted}
        playsInline
        controls={false}
      />

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-4">
          <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
          <p className="text-sm text-slate-400 text-center mb-3">{error}</p>
          <Button size="sm" variant="outline" onClick={handleRetry}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 mb-2"></div>
          <p className="text-xs text-slate-500">Memuat stream...</p>
        </div>
      )}

      {/* Live indicator */}
      <div className="absolute top-2 left-2">
        <span className="flex items-center gap-1 bg-red-600 text-white text-xs px-2 py-1 rounded">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span>
          LIVE
        </span>
      </div>

      {/* Controls overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Top controls */}
        <div className="absolute top-2 right-2 flex gap-2">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/20" onClick={handleMuteToggle}>
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Center play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            size="lg"
            variant="ghost"
            className="h-16 w-16 rounded-full bg-white/20 hover:bg-white/30 text-white"
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <span className="h-5 w-5 flex gap-1">
                <span className="w-1.5 h-5 bg-white rounded"></span>
                <span className="w-1.5 h-5 bg-white rounded"></span>
              </span>
            ) : (
              <Play className="h-6 w-6 ml-1" fill="white" />
            )}
          </Button>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-2 left-2 right-2 flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1" onClick={handleSnapshot}>
            <Download className="h-3 w-3 mr-1" />
            Snapshot
          </Button>
          <Button
            size="sm"
            variant={isRecording ? 'destructive' : 'secondary'}
            className="flex-1"
            onClick={handleRecord}
          >
            <div className="flex items-center gap-1">
              {isRecording && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>}
              {isRecording ? 'Stop' : 'Record'}
            </div>
          </Button>
          <Button size="sm" variant="secondary" onClick={handleRetry}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
