import { Link, useLocation } from 'react-router-dom';

export function NavBar() {
  const { pathname } = useLocation();
  const linkStyle = (path: string) => ({
    color: pathname === path ? '#7c3aed' : '#94a3b8',
    textDecoration: 'none', fontWeight: pathname === path ? 600 : 400,
    fontSize: '0.9rem',
  });

  return (
    <nav style={{
      display: 'flex', gap: '2rem', padding: '1rem 2rem',
      borderBottom: '1px solid #1e1e2e', justifyContent: 'center',
    }}>
      <Link to="/" style={linkStyle('/')}>Timer</Link>
      <Link to="/dashboard" style={linkStyle('/dashboard')}>Dashboard</Link>
      <Link to="/settings" style={linkStyle('/settings')}>Settings</Link>
    </nav>
  );
}
