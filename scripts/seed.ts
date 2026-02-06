import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user (mandatory test account)
  const adminPassword = await hash('johndoe123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create regular test user
  const userPassword = await hash('testuser123', 12);
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: {},
    create: {
      email: 'user@test.com',
      password: userPassword,
      name: 'Regular User',
      role: 'USER',
    },
  });
  console.log('✅ Regular user created:', regularUser.email);

  // Create camera groups
  const lantai1 = await prisma.cameraGroup.upsert({
    where: { name: 'Lantai 1' },
    update: {},
    create: {
      name: 'Lantai 1',
      description: 'Kamera di lantai 1',
      color: '#3B82F6',
      order: 1,
    },
  });

  const lantai2 = await prisma.cameraGroup.upsert({
    where: { name: 'Lantai 2' },
    update: {},
    create: {
      name: 'Lantai 2',
      description: 'Kamera di lantai 2',
      color: '#10B981',
      order: 2,
    },
  });

  const parkiran = await prisma.cameraGroup.upsert({
    where: { name: 'Area Parkir' },
    update: {},
    create: {
      name: 'Area Parkir',
      description: 'Kamera area parkir',
      color: '#F59E0B',
      order: 3,
    },
  });

  const entrance = await prisma.cameraGroup.upsert({
    where: { name: 'Pintu Masuk' },
    update: {},
    create: {
      name: 'Pintu Masuk',
      description: 'Kamera pintu masuk dan keluar',
      color: '#EF4444',
      order: 4,
    },
  });

  console.log('✅ Camera groups created');

  // Create test cameras (16 cameras for 4x4 grid)
  // Using demo RTSP URLs - replace with real URLs in production
  const cameras = [
    // Lantai 1 - 4 cameras
    { name: 'Lantai 1 - Lobby', group: lantai1.id, order: 1 },
    { name: 'Lantai 1 - Koridor A', group: lantai1.id, order: 2 },
    { name: 'Lantai 1 - Koridor B', group: lantai1.id, order: 3 },
    { name: 'Lantai 1 - Cafeteria', group: lantai1.id, order: 4 },
    
    // Lantai 2 - 4 cameras
    { name: 'Lantai 2 - Lobby', group: lantai2.id, order: 1 },
    { name: 'Lantai 2 - Koridor A', group: lantai2.id, order: 2 },
    { name: 'Lantai 2 - Koridor B', group: lantai2.id, order: 3 },
    { name: 'Lantai 2 - Meeting Room', group: lantai2.id, order: 4 },
    
    // Parkiran - 4 cameras
    { name: 'Parkir - Pintu Masuk', group: parkiran.id, order: 1 },
    { name: 'Parkir - Area A', group: parkiran.id, order: 2 },
    { name: 'Parkir - Area B', group: parkiran.id, order: 3 },
    { name: 'Parkir - Pintu Keluar', group: parkiran.id, order: 4 },
    
    // Pintu Masuk - 4 cameras
    { name: 'Pintu Utama - Depan', group: entrance.id, order: 1 },
    { name: 'Pintu Utama - Dalam', group: entrance.id, order: 2 },
    { name: 'Pintu Samping', group: entrance.id, order: 3 },
    { name: 'Pintu Belakang', group: entrance.id, order: 4 },
  ];

  // Demo RTSP URL - In production, use real camera URLs
  const demoRtspUrl = 'rtsp://demo:demo@demo.rtsp-server.com:554/stream';

  for (const camera of cameras) {
    // Check if camera exists
    const existing = await prisma.camera.findFirst({
      where: { name: camera.name },
    });

    if (!existing) {
      await prisma.camera.create({
        data: {
          name: camera.name,
          rtspUrl: demoRtspUrl,
          description: `Kamera CCTV ${camera.name}`,
          groupId: camera.group,
          status: 'OFFLINE',
          isActive: true,
          order: camera.order,
          recordingEnabled: false,
        },
      });
    }
  }
  console.log('✅ 16 cameras created');

  // Grant regular user access to some cameras (Lantai 1 only)
  const lantai1Cameras = await prisma.camera.findMany({
    where: { groupId: lantai1.id },
  });

  for (const camera of lantai1Cameras) {
    await prisma.userCameraPermission.upsert({
      where: {
        userId_cameraId: {
          userId: regularUser.id,
          cameraId: camera.id,
        },
      },
      update: {},
      create: {
        userId: regularUser.id,
        cameraId: camera.id,
      },
    });
  }
  console.log('✅ Camera permissions granted to regular user');

  console.log('🎉 Seed completed successfully!');
  console.log('\n📝 Test Accounts:');
  console.log('   Admin: john@doe.com / johndoe123');
  console.log('   User: user@test.com / testuser123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
