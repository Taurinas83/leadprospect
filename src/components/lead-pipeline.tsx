'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import {
  Users,
  GripVertical,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
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

const PIPELINE_STATUSES = [
  { key: 'Novo', label: 'Novo', color: '#64748b', bgClass: 'bg-slate-100 dark:bg-slate-900/40', badgeClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { key: 'Contatado', label: 'Contatado', color: '#0ea5e9', bgClass: 'bg-sky-50 dark:bg-sky-950/40', badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300' },
  { key: 'Qualificado', label: 'Qualificado', color: '#8b5cf6', bgClass: 'bg-violet-50 dark:bg-violet-950/40', badgeClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' },
  { key: 'Proposta', label: 'Proposta', color: '#f59e0b', bgClass: 'bg-amber-50 dark:bg-amber-950/40', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  { key: 'Fechado', label: 'Fechado', color: '#10b981', bgClass: 'bg-emerald-50 dark:bg-emerald-950/40', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
  { key: 'Perdido', label: 'Perdido', color: '#f43f5e', bgClass: 'bg-rose-50 dark:bg-rose-950/40', badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300' },
]

const LEAD_TYPE_BADGE: Record<string, string> = {
  pessoa_juridica: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  pessoa_fisica: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-rose-600'
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  if (score >= 40) return 'bg-orange-500'
  return 'bg-rose-500'
}

function LeadCard({
  lead,
  onClick,
}: {
  lead: Lead
  onClick: (lead: Lead) => void
}) {
  const isPF = lead.leadType === 'pessoa_fisica'

  return (
    <Card
      className="cursor-pointer border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
      onClick={() => onClick(lead)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1">
              <p className="truncate text-sm font-medium">{isPF ? lead.name : lead.company}</p>
              <div
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${getScoreBg(lead.score)}`}
              >
                {lead.score}
              </div>
            </div>
            <p className="truncate text-xs text-muted-foreground">{isPF ? lead.company || lead.name : lead.name}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {lead.niche}
              </Badge>
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 ${LEAD_TYPE_BADGE[lead.leadType] || ''}`}
              >
                {isPF ? 'PF' : 'PJ'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PipelineColumn({
  status,
  leads,
  onLeadClick,
}: {
  status: (typeof PIPELINE_STATUSES)[number]
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
}) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30">
      {/* Column Header */}
      <div className={`flex items-center justify-between rounded-t-xl px-3 py-2.5 ${status.bgClass}`}>
        <div className="flex items-center gap-2">
          <div
            className="size-2.5 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <span className="text-sm font-semibold">{status.label}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {leads.length}
        </Badge>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 p-2 overflow-y-auto max-h-[calc(100vh-280px)]">
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={horizontalListSortingStrategy}
        >
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={onLeadClick} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/60">
            <Users className="mb-1 size-6" />
            <p className="text-xs">Nenhum lead</p>
          </div>
        )}
      </div>
    </div>
  )
}

function PipelineSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STATUSES.map((status) => (
        <div key={status.key} className="w-72 shrink-0 rounded-xl border">
          <div className={`flex items-center justify-between rounded-t-xl px-3 py-2.5 ${status.bgClass}`}>
            <div className="flex items-center gap-2">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: status.color }} />
              <span className="text-sm font-semibold">{status.label}</span>
            </div>
            <Skeleton className="size-5 rounded-full" />
          </div>
          <div className="space-y-2 p-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <Skeleton className="mb-2 h-4 w-3/4" />
                  <Skeleton className="mb-2 h-3 w-1/2" />
                  <Skeleton className="h-5 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function LeadPipeline({ userId }: { userId?: string }) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const queryKey = userId ? ['leads', { userId }] : ['leads']

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (userId) params.set('userId', userId)
      const res = await fetch(`/api/leads?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch leads')
      return res.json()
    },
  })

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error('Failed to update lead')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Status do lead atualizado!')
    },
    onError: () => {
      toast.error('Erro ao mover lead. Tente novamente.')
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const leadsByStatus = PIPELINE_STATUSES.map((status) => ({
    status,
    leads: leads.filter((l) => l.status === status.key),
  }))

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over) return

      const leadId = active.id as string
      // Find the target column status
      const targetStatus = PIPELINE_STATUSES.find((s) => s.key === over.id)
      if (targetStatus) {
        const lead = leads.find((l) => l.id === leadId)
        if (lead && lead.status !== targetStatus.key) {
          updateLeadMutation.mutate({ id: leadId, status: targetStatus.key })
        }
        return
      }

      // If dropped on another lead card, find the column it belongs to
      const targetLeadId = over.id as string
      const targetLead = leads.find((l) => l.id === targetLeadId)
      if (targetLead) {
        const lead = leads.find((l) => l.id === leadId)
        if (lead && lead.status !== targetLead.status) {
          updateLeadMutation.mutate({ id: leadId, status: targetLead.status })
        }
      }
    },
    [leads, updateLeadMutation]
  )

  const handleLeadClick = useCallback((lead: Lead) => {
    setSelectedLead(lead)
    setDetailOpen(true)
  }, [])

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  if (isLoading) return <PipelineSkeleton />

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4">
            {leadsByStatus.map(({ status, leads: columnLeads }) => (
              <PipelineColumn
                key={status.key}
                status={status}
                leads={columnLeads}
                onLeadClick={handleLeadClick}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <DragOverlay>
          {activeLead ? (
            <div className="w-72 rotate-2 opacity-90">
              <LeadCard lead={activeLead} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </motion.div>
  )
}
