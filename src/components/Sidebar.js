'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'UNGGAH DOKUMEN', href: '/unggah' },
  { label: 'DASHBOARD MONITORING', href: '/dashboard' },
  { label: 'INFORMASI', href: '/informasi' },
  { label: 'TIM UKK', href: '/tim' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <aside style={{
      width: '200px',
      minWidth: '200px',
      backgroundColor: '#0d1117',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      height: '100vh',
      overflowY: 'auto',
      zIndex: 1000,
    }}>
      {/* Logo */}
      <div style={{
        padding: '1.25rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
      }}>
        <div style={{
          width: '34px',
          height: '34px',
          background: 'linear-gradient(135deg, #1d4ed8, #6d28d9)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 0 12px rgba(109,40,217,0.4)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 700, color: 'white', fontSize: '0.85rem', letterSpacing: '0.02em' }}>SI PANTAS</div>
          <div style={{ fontWeight: 700, color: 'white', fontSize: '0.85rem', letterSpacing: '0.02em' }}>UKK</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '1.25rem 0', flex: 1 }}>
        <Link
          href="/"
          style={{
            display: 'block',
            padding: '0.55rem 1rem',
            color: isHome ? '#60a5fa' : 'rgba(255,255,255,0.85)',
            textDecoration: 'none',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            marginBottom: '0.4rem',
          }}
        >
          ▲ BERANDA
        </Link>

        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'block',
                padding: '0.6rem 1rem 0.6rem 1.5rem',
                color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.55)',
                textDecoration: 'none',
                fontSize: '0.72rem',
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.04em',
                borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                transition: 'color 0.15s ease, border-color 0.15s ease',
                lineHeight: 1.4,
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.2)',
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        Kementerian Koperasi<br />dan UKM RI
      </div>
    </aside>
  );
}
