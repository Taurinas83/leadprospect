'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Save,
  Trash2,
  Loader2,
  Calendar,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone: string
  website: string
  address: string
  niche: string
  status: string
  score: number
  source: string
  notes: string
  createdAt: string
  updatedAt: string
}

const STATUS_OPTIONS = [
  'Novo',
  'Contatado',
  'Qualificado',
  'Proposta',
  'Fechado',
  'Perdido',
]

const NICHE_OPTIONS = [
  'Restaurante',
  'Clínica',
  'Escritório',
  'Loja',
  'Salão',
  'Oficina',
  'Outro',
]

const STATUS_COLORS: Record<string, string> = {
  Novo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Contatado: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  Qualificado: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  Proposta: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  Fechado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  Perdido: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function LeadDetailForm({
  lead,
  onOpenChange,
}: {
  lead: Lead
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: lead.name || '',
    company: lead.company || '',
    email: lead.email || '',
    phone: lead.phone || '',
    website: lead.website || '',
    address: lead.address || '',
    niche: lead.niche || '',
    status: lead.status || 'Novo',
    score: lead.score ?? 50,
    notes: lead.notes || '',
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Lead> & { id: string }) => {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update lead')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Lead atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      onOpenChange(false)
    },
    onError: () => {
      toast.error('Erro ao atualizar lead. Tente novamente.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leads?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete lead')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Lead excluído com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      onOpenChange(false)
    },
    onError: () => {
      toast.error('Erro ao excluir lead. Tente novamente.')
    },
  })

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    updateMutation.mutate({
      id: lead.id,
      name: form.name,
      company: form.company,
      email: form.email,
      phone: form.phone,
      website: form.website,
      address: form.address,
      niche: form.niche,
      status: form.status,
      score: form.score,
      notes: form.notes,
    })
  }

  const handleDelete = () => {
    deleteMutation.mutate(lead.id)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          Detalhes do Lead
          <Badge
            variant="secondary"
            className={STATUS_COLORS[lead.status] || ''}
          >
            {lead.status}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          Edite as informações do lead ou altere seu status no pipeline
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Name & Company */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">Nome</Label>
            <Input
              id="lead-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do contato"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-company">Empresa</Label>
            <Input
              id="lead-company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Nome da empresa"
            />
          </div>
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="lead-email">E-mail</Label>
            <Input
              id="lead-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-phone">Telefone</Label>
            <Input
              id="lead-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>

        {/* Website & Address */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="lead-website">Website</Label>
            <Input
              id="lead-website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://exemplo.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-address">Endereço</Label>
            <Input
              id="lead-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Rua, número - Cidade"
            />
          </div>
        </div>

        {/* Niche & Status */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nicho</Label>
            <Select
              value={form.niche}
              onValueChange={(v) => setForm({ ...form, niche: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o nicho" />
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
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Score */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Score</Label>
            <span className="text-sm font-medium text-emerald-600">
              {form.score}
            </span>
          </div>
          <Slider
            value={[form.score]}
            min={0}
            max={100}
            step={1}
            onValueChange={(v) => setForm({ ...form, score: v[0] })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="lead-notes">Notas</Label>
          <Textarea
            id="lead-notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Observações sobre o lead..."
            rows={3}
          />
        </div>

        <Separator />

        {/* Timestamps */}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3" />
            <span>Criado em: {formatDate(lead.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-3" />
            <span>Atualizado em: {formatDate(lead.updatedAt)}</span>
          </div>
        </div>
      </div>

      <DialogFooter className="flex-col gap-2 sm:flex-row">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-1">
              <Trash2 className="size-4" />
              Excluir
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Lead</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o lead &quot;{lead.name}&quot;? Esta ação não
                pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  'Excluir'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 gap-1"
          >
            {updateMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Salvar
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}

export default function LeadDetailModal({
  lead,
  open,
  onOpenChange,
}: {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!lead) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <LeadDetailForm
          key={lead.id}
          lead={lead}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  )
}
