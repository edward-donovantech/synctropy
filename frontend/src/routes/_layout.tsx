import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthGuard } from '../components/AuthGuard'

export default function DashboardLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0f0f1a] text-slate-200">
        <nav className="border-b border-[#2a2a3e] bg-[#13131f]">
          <div className="flex items-center justify-between px-6">
            <div className="flex">
              <Link
                to="/history"
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  pathname === '/history'
                    ? 'border-violet-400 text-violet-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                History
              </Link>
              <Link
                to="/settings"
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  pathname === '/settings'
                    ? 'border-violet-400 text-violet-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                Settings
              </Link>
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Sign out
            </button>
          </div>
        </nav>
        <main className="px-6 py-6 max-w-4xl mx-auto">
          <Outlet />
        </main>
      </div>
    </AuthGuard>
  )
}
