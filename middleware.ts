export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/cameras/:path*',
    '/recordings/:path*',
    '/playback/:path*',
  ],
};
