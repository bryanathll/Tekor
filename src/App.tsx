import { Suspense, lazy, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import Home from './components/Home'
// Halaman menu dimuat saat dibuka saja, supaya halaman utama tetap ringan
// (pustaka chart hanya ikut terunduh ketika Dashboard dibuka).
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Categories = lazy(() => import('./pages/Categories'))
const Statement = lazy(() => import('./pages/Statement'))
const Ask = lazy(() => import('./pages/Ask'))

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (checking) {
    return <p className="min-h-dvh p-6 text-muted">Memuat...</p>
  }

  if (!session) {
    return <Login />
  }

  // key={user.id}: bila ganti akun, seluruh halaman dibuat ulang sehingga data akun lama tidak tersisa.
  return (
    <Suspense fallback={<p className="min-h-dvh p-6 text-muted">Memuat...</p>}>
      <Routes key={session.user.id}>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/kategori" element={<Categories />} />
        <Route path="/statement" element={<Statement />} />
        <Route path="/tanya" element={<Ask />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
