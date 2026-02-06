# Analisis Project CCTV Dashboard (RTSP Multi-Stream)

Dokumen ini merangkum hasil pembelajaran cepat terhadap codebase `cctv-dashboard`.

## Ringkasan Teknologi

- **Framework**: Next.js App Router + React + TypeScript.
- **Auth**: NextAuth (credentials) + role (ADMIN/USER).
- **Database**: PostgreSQL via Prisma.
- **UI**: Tailwind + komponen Radix/shadcn.
- **Player**: HTML5 `<video>` + `hls.js`.

## Arsitektur Fitur Inti

### 1. Manajemen Akses Kamera

- Setiap user dapat dibatasi aksesnya per kamera melalui tabel `UserCameraPermission`.
- Role `ADMIN` bypass permission dan dapat melihat semua kamera aktif.
- Helper utama ada di `lib/auth-helpers.ts`:
  - `requireAuth()`
  - `requireAdmin()`
  - `checkCameraAccess()`
  - `getUserAccessibleCameras()`

### 2. Live View Multi Kamera

- Halaman live: `app/dashboard/live/page.tsx`.
- Grid live: `app/dashboard/live/_components/live-camera-grid.tsx`.
- Mendukung:
  - filter group (termasuk parent/subgroup),
  - layout **2x2** (4 kamera) dan **3x3** (9 kamera),
  - pagination otomatis,
  - expand satu kamera ke modal besar.

### 3. Video Playback di Browser

Komponen utama: `video-player.tsx`.

- Deteksi jenis stream dari URL (`hls`, `rtsp`, `rtmp`, `direct`, `unknown`).
- Untuk `hls` memakai `hls.js`.
- Untuk `rtsp/rtmp` menampilkan info bahwa browser tidak bisa play langsung dan butuh media server.
- Ada timeout loading 15 detik, retry, mute/unmute, play/pause, snapshot, start/stop recording.

## Temuan Penting untuk Use Case RTSP

1. **Endpoint stream belum melakukan konversi RTSP → HLS nyata**.
   - `app/api/stream/[cameraId]/route.ts` masih placeholder (mengembalikan URL HLS asumsi + message “pending implementation”).

2. **Data kamera tetap disimpan di field `rtspUrl`**, tapi player sekarang bisa menerima banyak format URL.
   - Secara implementasi saat ini, agar live benar-benar tampil di browser, nilai `rtspUrl` sebaiknya diisi URL HLS/http yang bisa diputar browser.

3. **Snapshot/recording masih level metadata DB**, belum menjalankan FFmpeg atau pipeline media sesungguhnya.
   - API membuat entry `Recording`/`Snapshot`, tetapi tidak ada proses capture/transcode file aktual.

## Implikasi Operasional

Untuk production multi RTSP, arsitektur idealnya:

1. Kamera IP kirim RTSP ke media server (MediaMTX/go2rtc).
2. Media server expose HLS/WebRTC untuk browser.
3. Dashboard konsumsi URL hasil konversi (bukan raw RTSP langsung).
4. Recording/snapshot dipindahkan ke worker/service media terpisah (FFmpeg pipeline), lalu status/metadata disinkronkan ke DB.

## Rekomendasi Prioritas

### Prioritas 1 (wajib agar live RTSP jalan)

- Implement service stream bridge (MediaMTX atau go2rtc).
- Ubah alur add/edit kamera agar menyimpan:
  - `sourceRtspUrl` (internal),
  - `playbackUrl` (HLS/WebRTC) untuk frontend.
- Integrasikan endpoint `/api/stream/[cameraId]` dengan media server API real.

### Prioritas 2 (stabilitas multi stream)

- Tambahkan health checker berkala untuk kamera/media endpoint.
- Tambahkan fallback kualitas stream (substream low-res untuk grid).
- Hindari update status kamera dari client-side secara langsung bila memungkinkan (pindah ke server-side health monitor).

### Prioritas 3 (recording/snapshot real)

- Implement job queue (BullMQ / worker service).
- Job `start recording` trigger FFmpeg command.
- Job `snapshot` capture single frame.
- Simpan file ke storage (disk/S3), lalu update metadata DB.

## Catatan Teknis Tambahan

- Di `prisma/schema.prisma`, generator `output` diarahkan ke path absolut environment lama (`/home/ubuntu/...`). Ini berisiko pada environment lain. Lebih aman gunakan default output Prisma client.
- Dokumentasi deployment sudah cukup baik dan sudah menyebut kebutuhan MediaMTX untuk konversi stream.

## Kesimpulan

Project ini sudah punya fondasi dashboard yang bagus (auth, RBAC, grid live, grouping, API CRUD). Namun untuk use case **multi RTSP production**, bagian paling kritis yang belum selesai adalah **pipeline media nyata** (RTSP ingest, transcode/relay ke HLS/WebRTC, recording/snapshot real). Setelah tiga prioritas di atas dikerjakan, project ini akan jauh lebih siap dipakai operasional.
