import { NextRequest, NextResponse } from 'next/server';

function isMegaHost(host:string){
  const bare = host.split(':')[0].toLowerCase();
  const configured = process.env.MEGA_HOST?.toLowerCase();
  return Boolean((configured && bare === configured) || bare.startsWith('mega.'));
}

export function middleware(request: NextRequest){
  if (!isMegaHost(request.headers.get('host') || '')) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/') || pathname === '/favicon.ico' || /\.[a-z0-9]+$/i.test(pathname)) {
    return NextResponse.next();
  }

  if (pathname === '/mega') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith('/mega/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(5) || '/';
    return NextResponse.redirect(url);
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? '/mega' : `/mega${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
