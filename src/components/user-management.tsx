'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-client'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import {
  Users,
  Plus,
  Pencil,
  KeyRound,
  Power,
  PowerOff,
  Loader2,
  AlertCircle,
  Shield,
  User,
  Lock,
  Search,
  Trash2,
} from 'lucide-react'

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  createdAt: string
  _count: { leads: number }
}

export default function UserManagement() {
  const { user: currentUser } = useAuth()
  const isManager = currentUser?.role === 'manager'

  // Data state
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [changeOwnPasswordDialogOpen, setChangeOwnPasswordDialogOpen] = useState(false)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Selected user for actions
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)

  // Add user form
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'member',
  })

  // Edit user form
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'member',
    active: true,
  })

  // Reset password form
  const [resetPasswordForm, setResetPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  })

  // Change own password form
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Submission loading states
  const [submitting, setSubmitting] = useState(false)

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/users')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao carregar usuários')
      }
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isManager) {
      fetchUsers()
    }
  }, [isManager, fetchUsers])

  // Filter users based on search
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Format date
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // --- Add User ---
  function openAddDialog() {
    setAddForm({ name: '', email: '', password: '', role: 'member' })
    setAddDialogOpen(true)
  }

  async function handleAddUser() {
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password.trim()) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    if (addForm.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar usuário')
      }

      toast.success('Usuário criado com sucesso!')
      setAddDialogOpen(false)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar usuário')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Edit User ---
  function openEditDialog(user: UserRow) {
    setSelectedUser(user)
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
    })
    setEditDialogOpen(true)
  }

  async function handleEditUser() {
    if (!selectedUser) return
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error('Nome e email são obrigatórios')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          active: editForm.active,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar usuário')
      }

      toast.success('Usuário atualizado com sucesso!')
      setEditDialogOpen(false)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar usuário')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Reset Password (Manager) ---
  function openResetPasswordDialog(user: UserRow) {
    setSelectedUser(user)
    setResetPasswordForm({ password: '', confirmPassword: '' })
    setResetPasswordDialogOpen(true)
  }

  async function handleResetPassword() {
    if (!selectedUser) return
    if (resetPasswordForm.password.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres')
      return
    }
    if (resetPasswordForm.password !== resetPasswordForm.confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: resetPasswordForm.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao redefinir senha')
      }

      toast.success('Senha redefinida com sucesso!')
      setResetPasswordDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao redefinir senha')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Toggle Active/Inactive ---
  function openDeactivateDialog(user: UserRow) {
    setSelectedUser(user)
    setDeactivateDialogOpen(true)
  }

  async function handleToggleActive() {
    if (!selectedUser) return

    setSubmitting(true)
    try {
      if (selectedUser.active) {
        // Deactivate
        const res = await fetch(`/api/users/${selectedUser.id}`, {
          method: 'DELETE',
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Erro ao desativar usuário')
        }

        toast.success('Usuário desativado com sucesso!')
      } else {
        // Activate
        const res = await fetch(`/api/users/${selectedUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: true }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Erro ao ativar usuário')
        }

        toast.success('Usuário ativado com sucesso!')
      }

      setDeactivateDialogOpen(false)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar status do usuário')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Change Own Password ---
  function openChangeOwnPasswordDialog() {
    setChangePasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setChangeOwnPasswordDialogOpen(true)
  }

  async function handleChangeOwnPassword() {
    if (!currentUser) return
    if (!changePasswordForm.currentPassword) {
      toast.error('Informe sua senha atual')
      return
    }
    if (changePasswordForm.newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres')
      return
    }
    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: changePasswordForm.newPassword,
          currentPassword: changePasswordForm.currentPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao alterar senha')
      }

      toast.success('Senha alterada com sucesso!')
      setChangeOwnPasswordDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar senha')
    } finally {
      setSubmitting(false)
    }
  }

  // If not a manager, show only the change password section
  if (!isManager) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
                <Lock className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base">Alterar Minha Senha</CardTitle>
                <CardDescription className="text-xs">
                  Atualize sua senha de acesso
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-sm">Senha atual</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Digite sua senha atual"
                value={changePasswordForm.currentPassword}
                onChange={(e) =>
                  setChangePasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={changePasswordForm.newPassword}
                onChange={(e) =>
                  setChangePasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a nova senha"
                value={changePasswordForm.confirmPassword}
                onChange={(e) =>
                  setChangePasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
              />
            </div>
            <Button
              onClick={handleChangeOwnPassword}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Alterando...
                </>
              ) : (
                <>
                  <KeyRound className="size-4" />
                  Alterar Senha
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- Manager View ---
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
                <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base">Gerenciamento de Usuários</CardTitle>
                <CardDescription className="text-xs">
                  Gerencie os usuários da plataforma
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={openChangeOwnPasswordDialog}
                className="gap-1.5"
              >
                <KeyRound className="size-3.5" />
                Minha Senha
              </Button>
              <Button
                size="sm"
                onClick={openAddDialog}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="size-3.5" />
                Novo Usuário
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Table */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          {/* Search */}
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
              Carregando usuários...
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="size-8 mb-2 text-red-500" />
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                className="mt-3"
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && users.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="size-8 mb-2" />
              <p className="text-sm font-medium">Nenhum usuário encontrado</p>
              <p className="text-xs">Adicione o primeiro usuário clicando no botão acima</p>
            </div>
          )}

          {/* No search results */}
          {!loading && !error && users.length > 0 && filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="size-8 mb-2" />
              <p className="text-sm font-medium">Nenhum resultado para &quot;{searchTerm}&quot;</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="text-emerald-600"
              >
                Limpar busca
              </Button>
            </div>
          )}

          {/* Table */}
          {!loading && !error && filteredUsers.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Nome</TableHead>
                    <TableHead className="min-w-[200px]">Email</TableHead>
                    <TableHead className="min-w-[90px]">Papel</TableHead>
                    <TableHead className="min-w-[90px]">Status</TableHead>
                    <TableHead className="min-w-[90px] text-center">Leads</TableHead>
                    <TableHead className="min-w-[100px]">Criado em</TableHead>
                    <TableHead className="min-w-[180px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id} className={!u.active ? 'opacity-60' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {u.id === currentUser?.id && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                              (você)
                            </span>
                          )}
                          {u.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        {u.role === 'manager' ? (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                            <Shield className="size-3" />
                            Gestor
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                            <User className="size-3" />
                            Membro
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {u.active ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-medium tabular-nums">
                        {u._count.leads}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(u)}
                            className="h-8 gap-1 text-xs"
                            title="Editar"
                          >
                            <Pencil className="size-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openResetPasswordDialog(u)}
                            className="h-8 gap-1 text-xs"
                            title="Redefinir senha"
                          >
                            <KeyRound className="size-3.5" />
                            <span className="hidden sm:inline">Senha</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeactivateDialog(u)}
                            disabled={u.id === currentUser?.id}
                            className={`h-8 gap-1 text-xs ${
                              u.active
                                ? 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950'
                            }`}
                            title={u.active ? 'Desativar' : 'Ativar'}
                          >
                            {u.active ? (
                              <>
                                <PowerOff className="size-3.5" />
                                <span className="hidden sm:inline">Desativar</span>
                              </>
                            ) : (
                              <>
                                <Power className="size-3.5" />
                                <span className="hidden sm:inline">Ativar</span>
                              </>
                            )}
                          </Button>
                          {!u.active && u.id !== currentUser?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setSelectedUser(u); setDeleteDialogOpen(true) }}
                              className="h-8 gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                              title="Excluir permanentemente"
                            >
                              <Trash2 className="size-3.5" />
                              <span className="hidden sm:inline">Excluir</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Add User Dialog ===== */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-emerald-600" />
              Novo Usuário
            </DialogTitle>
            <DialogDescription>
              Preencha os dados para criar um novo usuário na plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-name">Nome *</Label>
              <Input
                id="add-name"
                placeholder="Nome completo"
                value={addForm.name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email *</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="email@exemplo.com"
                value={addForm.email}
                onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">Senha *</Label>
              <Input
                id="add-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={addForm.password}
                onChange={(e) => setAddForm((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role">Papel</Label>
              <Select
                value={addForm.role}
                onValueChange={(value) => setAddForm((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <User className="size-3.5" />
                      Membro
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <Shield className="size-3.5" />
                      Gestor
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Usuário'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Edit User Dialog ===== */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-emerald-600" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription>
              Atualize os dados do usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                placeholder="Nome completo"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="email@exemplo.com"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Papel</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <User className="size-3.5" />
                      Membro
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <Shield className="size-3.5" />
                      Gestor
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Status da Conta</Label>
                <p className="text-xs text-muted-foreground">
                  {editForm.active ? 'O usuário pode acessar a plataforma' : 'O usuário está bloqueado'}
                </p>
              </div>
              <Button
                variant={editForm.active ? 'destructive' : 'default'}
                size="sm"
                onClick={() => setEditForm((prev) => ({ ...prev, active: !prev.active }))}
                disabled={selectedUser?.id === currentUser?.id}
                className={
                  editForm.active
                    ? ''
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }
              >
                {editForm.active ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Reset Password Dialog ===== */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-emerald-600" />
              Redefinir Senha
            </DialogTitle>
            <DialogDescription>
              Defina uma nova senha para{' '}
              <span className="font-semibold text-foreground">{selectedUser?.name}</span>.
              A senha atual não é necessária.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reset-password">Nova senha</Label>
              <Input
                id="reset-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={resetPasswordForm.password}
                onChange={(e) =>
                  setResetPasswordForm((prev) => ({ ...prev, password: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password">Confirmar nova senha</Label>
              <Input
                id="reset-confirm-password"
                type="password"
                placeholder="Repita a nova senha"
                value={resetPasswordForm.confirmPassword}
                onChange={(e) =>
                  setResetPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetPasswordDialogOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Redefinindo...
                </>
              ) : (
                'Redefinir Senha'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Change Own Password Dialog ===== */}
      <Dialog open={changeOwnPasswordDialogOpen} onOpenChange={setChangeOwnPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="size-5 text-emerald-600" />
              Alterar Minha Senha
            </DialogTitle>
            <DialogDescription>
              Informe sua senha atual e a nova senha desejada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="own-current-password">Senha atual</Label>
              <Input
                id="own-current-password"
                type="password"
                placeholder="Digite sua senha atual"
                value={changePasswordForm.currentPassword}
                onChange={(e) =>
                  setChangePasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="own-new-password">Nova senha</Label>
              <Input
                id="own-new-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={changePasswordForm.newPassword}
                onChange={(e) =>
                  setChangePasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="own-confirm-password">Confirmar nova senha</Label>
              <Input
                id="own-confirm-password"
                type="password"
                placeholder="Repita a nova senha"
                value={changePasswordForm.confirmPassword}
                onChange={(e) =>
                  setChangePasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangeOwnPasswordDialogOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangeOwnPassword}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Alterando...
                </>
              ) : (
                'Alterar Senha'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Deactivate Confirmation Dialog ===== */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {selectedUser?.active ? (
                <>
                  <PowerOff className="size-5 text-red-500" />
                  Desativar Usuário
                </>
              ) : (
                <>
                  <Power className="size-5 text-emerald-600" />
                  Ativar Usuário
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.active ? (
                <>
                  Tem certeza que deseja desativar o usuário{' '}
                  <span className="font-semibold text-foreground">{selectedUser?.name}</span>?
                  O usuário não poderá mais acessar a plataforma, mas seus dados serão preservados.
                </>
              ) : (
                <>
                  Deseja ativar o usuário{' '}
                  <span className="font-semibold text-foreground">{selectedUser?.name}</span>?
                  Ele poderá acessar a plataforma novamente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              disabled={submitting}
              className={
                selectedUser?.active
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {selectedUser?.active ? 'Desativando...' : 'Ativando...'}
                </>
              ) : selectedUser?.active ? (
                'Desativar'
              ) : (
                'Ativar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== Permanent Delete Confirmation Dialog ===== */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-red-500" />
              Excluir Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <span className="font-semibold text-foreground">{selectedUser?.name}</span> permanentemente?
              Esta ação não pode ser desfeita. Os leads deste usuário serão transferidos para você.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!selectedUser) return
                setSubmitting(true)
                try {
                  const res = await fetch(`/api/users/${selectedUser.id}?permanent=true`, {
                    method: 'DELETE',
                  })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data.error || 'Erro ao excluir usuário')
                  toast.success(data.message || 'Usuário excluído permanentemente!')
                  setDeleteDialogOpen(false)
                  fetchUsers()
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Erro ao excluir usuário')
                } finally {
                  setSubmitting(false)
                }
              }}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Permanentemente'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
