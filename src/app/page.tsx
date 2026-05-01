'use client'

import { useSession, signOut } from 'next-auth/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  LayoutDashboard,
  Search,
  Columns3,
  List,
  Target,
  Sparkles,
  LogOut,
  Shield,
  User,
} from 'lucide-react'

import LoginPage from '@/components/login-page'
import LeadDashboard from '@/components/lead-dashboard'
import LeadSearch from '@/components/lead-search'
import LeadPipeline from '@/components/lead-pipeline'
import LeadList from '@/components/lead-list'
import { useState } from 'react'
import { Label } from '@/components/ui/label'

export default function Home() {
  const { data: session, status } = useSession()
  const [viewAllLeads, setViewAllLeads] = useState(true)

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Target className="size-5 animate-pulse" />
          Carregando...
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return <LoginPage />
  }

  const user = session.user as { id: string; name: string; email: string; role: string }
  const isManager = user.role === 'manager'
  // Managers can toggle between all leads and their own; members always see only their own
  const filterUserId = isManager && viewAllLeads ? undefined : user.id

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <Target className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight leading-none">
                LeadProspect
              </h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                Prospecção Inteligente
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Manager toggle */}
            {isManager && (
              <div className="hidden items-center gap-2 sm:flex">
                <Switch
                  id="view-all"
                  checked={viewAllLeads}
                  onCheckedChange={setViewAllLeads}
                />
                <Label htmlFor="view-all" className="text-xs text-muted-foreground cursor-pointer">
                  Ver todos
                </Label>
              </div>
            )}

            {/* AI Badge */}
            <div className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 sm:flex">
              <Sparkles className="size-3" />
              AI-Powered
            </div>

            {/* User Info */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border px-3 py-1">
                {isManager ? (
                  <Shield className="size-3.5 text-amber-600" />
                ) : (
                  <User className="size-3.5 text-slate-500" />
                )}
                <span className="text-xs font-medium">{user.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  ({isManager ? 'Gestor' : 'Membro'})
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Sair"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="dashboard" className="gap-1.5">
              <LayoutDashboard className="size-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-1.5">
              <Search className="size-4" />
              <span className="hidden sm:inline">Buscar</span>
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-1.5">
              <Columns3 className="size-4" />
              <span className="hidden sm:inline">Pipeline</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="size-4" />
              <span className="hidden sm:inline">Lista</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <LeadDashboard userId={filterUserId} />
          </TabsContent>
          <TabsContent value="search">
            <LeadSearch userId={user.id} />
          </TabsContent>
          <TabsContent value="pipeline">
            <LeadPipeline userId={filterUserId} />
          </TabsContent>
          <TabsContent value="list">
            <LeadList userId={filterUserId} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t py-4">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
          LeadProspect — Plataforma de Prospecção de Leads © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}
