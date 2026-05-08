'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Bot, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface AgentSearchForm {
  niche: string
  location: string
  leadType: 'pessoa_juridica' | 'pessoa_fisica'
  maxLeads: number
}

export default function AgentSearchPanel() {
  const [form, setForm] = useState<AgentSearchForm>({
    niche: '',
    location: '',
    leadType: 'pessoa_juridica',
    maxLeads: 20,
  })

  const mutation = useMutation({
    mutationFn: async (data: AgentSearchForm) => {
      const res = await fetch('/api/agent-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro na prospecção')
      }
      
      return res.json()
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Prospecção concluída! ${data.leadsFound} leads encontrados.`)
      } else {
        toast.error('Prospecção falhou', {
          description: data.errors.join(', '),
        })
      }
    },
    onError: (error: Error) => {
      toast.error('Erro na prospecção', {
        description: error.message,
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.niche.trim()) {
      toast.error('Informe o nicho de atuação')
      return
    }

    mutation.mutate(form)
  }

  const isProcessing = mutation.isPending

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-5 text-primary" />
          Agente de Prospecção Inteligente
        </CardTitle>
        <CardDescription>
          O agente navega automaticamente na web, coleta e organiza leads no seu CRM
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="niche">Nicho / Segmento *</Label>
            <Input
              id="niche"
              placeholder="Ex: Marketing Digital, Restaurantes, Clínicas..."
              value={form.niche}
              onChange={(e) => setForm({ ...form, niche: e.target.value })}
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Localização</Label>
            <Input
              id="location"
              placeholder="Ex: São Paulo, Brasil..."
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              disabled={isProcessing}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Lead</Label>
              <Select
                value={form.leadType}
                onValueChange={(value: any) => setForm({ ...form, leadType: value })}
                disabled={isProcessing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem>
                  <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Máximo de Leads</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={form.maxLeads}
                onChange={(e) => setForm({ ...form, maxLeads: parseInt(e.target.value) })}
                disabled={isProcessing}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isProcessing || !form.niche.trim()}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Prospecção em andamento...
              </>
            ) : (
              <>
                <Bot className="mr-2 size-4" />
                Iniciar Prospecção Automática
              </>
            )}
          </Button>

          {mutation.isSuccess && mutation.data?.success && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="size-4" />
              {mutation.data.leadsFound} leads salvos no CRM
            </div>
          )}

          {mutation.isError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="size-4" />
              Erro na prospecção
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
