'use client'

import { motion } from 'framer-motion'
import {
  Users,
  UserPlus,
  TrendingUp,
  DollarSign,
  Search,
  Columns3,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

interface LeadStats {
  totalLeads: number
  newThisWeek: number
  conversionRate: number
  pipelineValue: number
  leadsByStatus: { status: string; count: number }[]
  leadsByNiche: { niche: string; count: number }[]
  recentLeads: {
    id: string
    name: string
    company: string
    niche: string
    status: string
    score: number
    createdAt: string
  }[]
}

const STATUS_COLORS: Record<string, string> = {
  Novo: '#64748b',
  Contatado: '#0ea5e9',
  Qualificado: '#8b5cf6',
  Proposta: '#f59e0b',
  Fechado: '#10b981',
  Perdido: '#f43f5e',
}

const NICHE_COLORS = [
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#f59e0b',
  '#8b5cf6',
  '#f43f5e',
  '#64748b',
]

const STATUS_BADGE_CLASS: Record<string, string> = {
  Novo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Contatado: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  Qualificado: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  Proposta: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  Fechado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  Perdido: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  subtitle?: string
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="relative overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div
              className="flex size-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="size-6" style={{ color }} />
            </div>
          </div>
          <div
            className="absolute bottom-0 left-0 h-1 w-full"
            style={{ backgroundColor: color }}
          />
        </CardContent>
      </Card>
    </motion.div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="size-12 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LeadDashboard() {
  const { data: stats, isLoading } = useQuery<LeadStats>({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
  })

  if (isLoading) return <DashboardSkeleton />

  const metrics = stats
    ? [
        {
          title: 'Total Leads',
          value: stats.totalLeads,
          icon: Users,
          color: '#10b981',
          subtitle: 'All time',
        },
        {
          title: 'New This Week',
          value: stats.newThisWeek,
          icon: UserPlus,
          color: '#14b8a6',
          subtitle: 'Last 7 days',
        },
        {
          title: 'Conversion Rate',
          value: `${stats.conversionRate}%`,
          icon: TrendingUp,
          color: '#f59e0b',
          subtitle: 'Fechado / Total',
        },
        {
          title: 'Pipeline Value',
          value: `R$ ${(stats.pipelineValue ?? 0).toLocaleString('pt-BR')}`,
          icon: DollarSign,
          color: '#8b5cf6',
          subtitle: 'Active pipeline',
        },
      ]
    : []

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Banner */}
      <motion.div variants={itemVariants}>
        <Card className="relative overflow-hidden border-0">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700" />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url(/hero-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <CardContent className="relative p-6 sm:p-8">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Bem-vindo ao LeadProspect
              </h2>
              <p className="mt-2 text-sm text-emerald-100 sm:text-base">
                Encontre leads qualificados com busca inteligente por IA e gerencie seu pipeline de vendas em um só lugar.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                  <Search className="size-3.5" />
                  Busca Inteligente
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                  <Columns3 className="size-3.5" />
                  Pipeline Kanban
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                  <TrendingUp className="size-3.5" />
                  Analytics em Tempo Real
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bar Chart - Leads by Status */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Leads por Status</CardTitle>
              <CardDescription>Distribuição de leads em cada etapa do pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.leadsByStatus ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="status"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--popover))',
                        color: 'hsl(var(--popover-foreground))',
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {(stats?.leadsByStatus ?? []).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[entry.status] || '#64748b'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie Chart - Leads by Niche */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Leads por Nicho</CardTitle>
              <CardDescription>Distribuição de leads por segmento de mercado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.leadsByNiche ?? []}
                      dataKey="count"
                      nameKey="niche"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ niche, percent }) =>
                        `${niche} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {(stats?.leadsByNiche ?? []).map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={NICHE_COLORS[index % NICHE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--popover))',
                        color: 'hsl(var(--popover-foreground))',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Leads */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Leads Recentes</CardTitle>
            <CardDescription>Últimos 5 leads adicionados ao pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              {(stats?.recentLeads ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Users className="mb-2 size-10 opacity-50" />
                  <p className="text-sm">Nenhum lead encontrado</p>
                  <p className="text-xs">Comece buscando novos leads para o pipeline</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(stats?.recentLeads ?? []).map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-9 items-center justify-center rounded-full text-sm font-medium"
                          style={{
                            backgroundColor: `${STATUS_COLORS[lead.status] || '#64748b'}20`,
                            color: STATUS_COLORS[lead.status] || '#64748b',
                          }}
                        >
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {lead.company} · {lead.niche}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={STATUS_BADGE_CLASS[lead.status] || ''}
                        >
                          {lead.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Score: {lead.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
