'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Building2,
  Users,
  AtSign,
  Linkedin,
  MessageCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import LeadDetailModal from './lead-detail-modal'

interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone: string
  whatsapp: string
  website: string
  instagram: string
  linkedin: string
  address: string
  niche: string
  status: string
  leadType: string
  score: number
  source: string
  notes: string
  createdAt: string
  updatedAt: string
}

const STATUS_OPTIONS = [
  'Todos',
  'Novo',
  'Contatado',
  'Qualificado',
  'Proposta',
  'Fechado',
  'Perdido',
]

const NICHE_OPTIONS = [
  'Todos',
  'Restaurante',
  'Clínica',
  'Escritório',
  'Loja',
  'Salão',
  'Oficina',
  'Outro',
]

const STATUS_BADGE_CLASS: Record<string, string> = {
  Novo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Contatado: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  Qualificado: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  Proposta: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  Fechado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  Perdido: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
}

const LEAD_TYPE_BADGE_CLASS: Record<string, string> = {
  pessoa_juridica: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  pessoa_fisica: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
}

function getScoreBadge(score: number) {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
  if (score >= 60) return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
  if (score >= 40) return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
  return 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300'
}

const PAGE_SIZE = 10

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  )
}

export default function LeadList({ userId }: { userId?: string }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [nicheFilter, setNicheFilter] = useState('Todos')
  const [page, setPage] = useState(1)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const queryKey = userId ? ['leads', { userId }] : ['leads']

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'Todos') params.set('status', statusFilter)
      if (nicheFilter && nicheFilter !== 'Todos') params.set('niche', nicheFilter)
      if (search) params.set('search', search)
      if (userId) params.set('userId', userId)
      const res = await fetch(`/api/leads?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch leads')
      return res.json()
    },
  })

  // Client-side filtering for search (in case API doesn't support it)
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !search ||
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.company.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === 'Todos' || lead.status === statusFilter
    const matchesNiche =
      nicheFilter === 'Todos' || lead.niche === nicheFilter
    return matchesSearch && matchesStatus && matchesNiche
  })

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE))
  const paginatedLeads = filteredLeads.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  )

  const handleRowClick = useCallback((lead: Lead) => {
    setSelectedLead(lead)
    setDetailOpen(true)
  }, [])

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5 text-emerald-600" />
            Todos os Leads
          </CardTitle>
          <CardDescription>
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} encontrado
            {filteredLeads.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou empresa..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-36">
                  <Filter className="size-3.5 mr-1" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={nicheFilter}
                onValueChange={(v) => {
                  setNicheFilter(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-36">
                  <Building2 className="size-3.5 mr-1" />
                  <SelectValue placeholder="Nicho" />
                </SelectTrigger>
                <SelectContent>
                  {NICHE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <ListSkeleton />
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="mb-3 size-12 opacity-40" />
              <p className="text-sm font-medium">Nenhum lead encontrado</p>
              <p className="mt-1 text-xs">
                Ajuste os filtros ou adicione novos leads ao pipeline
              </p>
            </div>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="hidden md:table-cell">Tipo</TableHead>
                      <TableHead className="hidden md:table-cell">Nicho</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead className="hidden lg:table-cell">Social</TableHead>
                      <TableHead className="hidden lg:table-cell">Fonte</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLeads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer"
                        onClick={() => handleRowClick(lead)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium">{lead.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{lead.company || '—'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${LEAD_TYPE_BADGE_CLASS[lead.leadType] || ''}`}
                          >
                            {lead.leadType === 'pessoa_fisica' ? 'PF' : 'PJ'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {lead.niche}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={STATUS_BADGE_CLASS[lead.status] || ''}
                          >
                            {lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getScoreBadge(lead.score)}>
                            {lead.score}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-1">
                            {lead.instagram && (
                              <AtSign className="size-3.5" style={{ color: '#E4405F' }} />
                            )}
                            {lead.linkedin && (
                              <Linkedin className="size-3.5" style={{ color: '#0A66C2' }} />
                            )}
                            {lead.whatsapp && (
                              <MessageCircle className="size-3.5" style={{ color: '#25D366' }} />
                            )}
                            {!lead.instagram && !lead.linkedin && !lead.whatsapp && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                          {lead.source || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRowClick(lead)
                            }}
                          >
                            <Eye className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filteredLeads.length)} de{' '}
                  {filteredLeads.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      // Show first, last, and pages near current
                      return p === 1 || p === totalPages || Math.abs(p - page) <= 1
                    })
                    .map((p, i, arr) => {
                      const prev = arr[i - 1]
                      const showEllipsis = prev !== undefined && p - prev > 1
                      return (
                        <span key={p} className="flex items-center">
                          {showEllipsis && (
                            <span className="px-1 text-muted-foreground">…</span>
                          )}
                          <Button
                            variant={p === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPage(p)}
                            className={p === page ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                          >
                            {p}
                          </Button>
                        </span>
                      )
                    })}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </motion.div>
  )
}
