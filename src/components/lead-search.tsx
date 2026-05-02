'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Search, Plus, Globe, Building2, MapPin, Loader2,
  User, Briefcase, Instagram, Linkedin, MessageCircle,
} from 'lucide-react'
import { toast } from 'sonner'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

interface SearchResult {
  name: string
  website: string
  snippet: string
  niche: string
  location?: string
  instagram?: string
  linkedin?: string
  whatsapp?: string
}

const NICHE_OPTIONS = [
  'Restaurante',
  'Clínica',
  'Escritório',
  'Loja',
  'Salão',
  'Oficina',
  'Consultoria',
  'Nutricionista',
  'Personal Trainer',
  'Artesanato',
  'Outro',
]

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

function SearchSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-full" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      ))}
    </div>
  )
}

export default function LeadSearch({ userId }: { userId: string }) {
  const [query, setQuery] = useState('')
  const [niche, setNiche] = useState('')
  const [location, setLocation] = useState('')
  const [leadType, setLeadType] = useState('pessoa_juridica')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const [leadName, setLeadName] = useState('')
  const [leadCompany, setLeadCompany] = useState('')
  const [leadWhatsapp, setLeadWhatsapp] = useState('')
  const [leadInstagram, setLeadInstagram] = useState('')
  const [leadLinkedin, setLeadLinkedin] = useState('')

  const queryClient = useQueryClient()
  const isPF = leadType === 'pessoa_fisica'

  const searchMutation = useMutation({
    mutationFn: async (params: { query: string; niche: string; location: string; leadType: string }) => {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      const rawResults = data.results || []
      return rawResults.map((r: {
        name?: string; url?: string; snippet?: string; host_name?: string;
        instagram?: string; linkedin?: string; whatsapp?: string;
      }) => ({
        name: r.name || 'Unknown',
        website: r.url || '',
        snippet: r.snippet || '',
        niche: params.niche || 'Outro',
        location: params.location || '',
        instagram: r.instagram || '',
        linkedin: r.linkedin || '',
        whatsapp: r.whatsapp || '',
      })) as SearchResult[]
    },
    onMutate: () => {
      setIsSearching(true)
    },
    onSuccess: (data) => {
      setResults(data)
      setHasSearched(true)
    },
    onError: () => {
      toast.error('Erro ao buscar leads. Tente novamente.')
    },
    onSettled: () => {
      setIsSearching(false)
    },
  })

  const addLeadMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to add lead')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Lead adicionado com sucesso!')
      setAddDialogOpen(false)
      setSelectedResult(null)
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: () => {
      toast.error('Erro ao adicionar lead. Tente novamente.')
    },
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) {
      toast.error('Digite um termo para buscar')
      return
    }
    searchMutation.mutate({ query, niche, location, leadType })
  }

  const handleAddLead = (result: SearchResult) => {
    setSelectedResult(result)
    setLeadName(result.name)
    setLeadCompany(isPF ? '' : result.name)
    setLeadWhatsapp(result.whatsapp || '')
    setLeadInstagram(result.instagram || '')
    setLeadLinkedin(result.linkedin || '')
    setAddDialogOpen(true)
  }

  const confirmAddLead = () => {
    if (!selectedResult) return
    addLeadMutation.mutate({
      name: leadName,
      company: leadCompany || (isPF ? '' : selectedResult.name),
      email: '',
      phone: '',
      whatsapp: leadWhatsapp,
      website: selectedResult.website,
      instagram: leadInstagram,
      linkedin: leadLinkedin,
      niche: selectedResult.niche || niche || 'Outro',
      leadType,
      source: 'Busca',
      status: 'Novo',
      score: 50,
      userId,
    })
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="size-5 text-emerald-600" />
            Buscar Leads
          </CardTitle>
          <CardDescription>
            Encontre prospectos por segmento, localização e tipo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
            <div className="flex-1 space-y-1.5 min-w-[200px]">
              <label className="text-sm font-medium">Busca</label>
              <Input
                placeholder={isPF ? 'Ex: nutricionista, personal trainer, consultor...' : 'Ex: restaurantes italianos, clínicas odontológicas...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-full space-y-1.5 sm:w-40">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={leadType} onValueChange={setLeadType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoa_juridica">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="size-3" /> PJ - Empresa
                    </span>
                  </SelectItem>
                  <SelectItem value="pessoa_fisica">
                    <span className="flex items-center gap-1.5">
                      <User className="size-3" /> PF - Pessoa
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1.5 sm:w-40">
              <label className="text-sm font-medium">Nicho</label>
              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {NICHE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1.5 sm:w-36">
              <label className="text-sm font-medium">Localização</label>
              <Input
                placeholder="Ex: São Paulo"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={isSearching}
              className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
            >
              {isSearching ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="size-4" />
                  Buscar
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>
            {hasSearched
              ? `${results.length} resultado${results.length !== 1 ? 's' : ''} encontrado${results.length !== 1 ? 's' : ''}`
              : 'Realize uma busca para encontrar prospects'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSearching ? (
            <SearchSkeleton />
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="mb-3 size-12 opacity-40" />
              <p className="text-sm font-medium">Nenhuma busca realizada</p>
              <p className="mt-1 text-xs">
                Use o formulário acima para buscar novos leads
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Building2 className="mb-3 size-12 opacity-40" />
              <p className="text-sm font-medium">Nenhum resultado encontrado</p>
              <p className="mt-1 text-xs">
                Tente ajustar os termos da busca ou o nicho selecionado
              </p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Website</TableHead>
                    <TableHead className="hidden lg:table-cell">Redes Sociais</TableHead>
                    <TableHead className="hidden md:table-cell">Descrição</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <motion.tr
                      key={`${result.name}-${index}`}
                      className="border-b transition-colors hover:bg-muted/50"
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      custom={index}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                            {isPF ? <User className="size-4" /> : <Building2 className="size-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{result.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Badge variant="outline" className="text-[10px]">
                                {isPF ? 'PF' : 'PJ'}
                              </Badge>
                              {result.niche && (
                                <Badge variant="outline" className="text-[10px]">
                                  {result.niche}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {result.website ? (
                          <a
                            href={result.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                          >
                            <Globe className="size-3" />
                            {result.website.replace(/^https?:\/\//, '').slice(0, 30)}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          {result.instagram && (
                            <a href={result.instagram} target="_blank" rel="noopener noreferrer" title="Instagram">
                              <Instagram className="size-4 text-pink-500 hover:text-pink-600" />
                            </a>
                          )}
                          {result.linkedin && (
                            <a href={result.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn">
                              <Linkedin className="size-4 text-blue-600 hover:text-blue-700" />
                            </a>
                          )}
                          {result.whatsapp && (
                            <a href={`https://wa.me/${result.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" title="WhatsApp">
                              <MessageCircle className="size-4 text-green-500 hover:text-green-600" />
                            </a>
                          )}
                          {!result.instagram && !result.linkedin && !result.whatsapp && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden max-w-xs truncate md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {result.snippet ? result.snippet.slice(0, 80) + '...' : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddLead(result)}
                          className="gap-1"
                        >
                          <Plus className="size-3" />
                          Adicionar
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Lead Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar como Lead</DialogTitle>
            <DialogDescription>
              Confirme as informações para adicionar este prospecto ao pipeline
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome do Contato</label>
                <Input
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="Nome do contato"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Empresa {isPF && <span className="text-muted-foreground">(opcional)</span>}
                </label>
                <Input
                  value={leadCompany}
                  onChange={(e) => setLeadCompany(e.target.value)}
                  placeholder={isPF ? 'Opcional para PF' : 'Nome da empresa'}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  <Instagram className="size-3.5 text-pink-500" /> Instagram
                </label>
                <Input
                  value={leadInstagram}
                  onChange={(e) => setLeadInstagram(e.target.value)}
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  <Linkedin className="size-3.5 text-blue-600" /> LinkedIn
                </label>
                <Input
                  value={leadLinkedin}
                  onChange={(e) => setLeadLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <MessageCircle className="size-3.5 text-green-500" /> WhatsApp
              </label>
              <Input
                value={leadWhatsapp}
                onChange={(e) => setLeadWhatsapp(e.target.value)}
                placeholder="5511999999999"
              />
            </div>
            {selectedResult && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="size-3" />
                  <span>{selectedResult.website || 'Sem website'}</span>
                </div>
                {selectedResult.niche && (
                  <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                    <Building2 className="size-3" />
                    <span>{selectedResult.niche}</span>
                  </div>
                )}
                {selectedResult.location && (
                  <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-3" />
                    <span>{selectedResult.location}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmAddLead}
              disabled={addLeadMutation.isPending || !leadName.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {addLeadMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Adicionar Lead
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
