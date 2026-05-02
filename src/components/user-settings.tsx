'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-client'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound, Loader2, Lock, Shield, User } from 'lucide-react'

export default function UserSettings() {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  if (!user) return null

  const isManager = user.role === 'manager'

  async function handleChangePassword() {
    if (!form.currentPassword) {
      toast.error('Informe sua senha atual')
      return
    }
    if (form.newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: form.newPassword,
          currentPassword: form.currentPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao alterar senha')
      }

      toast.success('Senha alterada com sucesso!')
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar senha')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
              {isManager ? (
                <Shield className="size-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <User className="size-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">Meu Perfil</CardTitle>
              <CardDescription className="text-xs">
                Informações da sua conta
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <p className="text-sm font-medium">{user.name}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Papel</Label>
              <p className="text-sm font-medium">{isManager ? 'Gestor' : 'Membro'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <Lock className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Alterar Senha</CardTitle>
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
              value={form.currentPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm">Nova senha</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={form.newPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm">Confirmar nova senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repita a nova senha"
              value={form.confirmPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            />
          </div>
          <Button
            onClick={handleChangePassword}
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
