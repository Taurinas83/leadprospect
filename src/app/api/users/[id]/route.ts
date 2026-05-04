import { db, ensureDbInitialized } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireManager, requireAuth, authErrorResponse } from '@/lib/auth-custom'
import { hash, compare } from 'bcryptjs'

// PATCH /api/users/[id] - Update a user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized()
    const currentUser = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { name, email, role, active, password, currentPassword } = body

    // Determine what the user can do
    const isManager = currentUser.role === 'manager'
    const isSelf = currentUser.id === id

    // Users can only edit themselves (name, password) unless they're a manager
    if (!isManager && !isSelf) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}

    // Name update - anyone can update their own name
    if (name !== undefined) {
      data.name = name
    }

    // Email update - manager only
    if (email !== undefined && isManager) {
      // Check if email is taken by another user
      const existingWithEmail = await db.user.findUnique({ where: { email } })
      if (existingWithEmail && existingWithEmail.id !== id) {
        return NextResponse.json(
          { error: 'Já existe um usuário com este email' },
          { status: 409 }
        )
      }
      data.email = email
    }

    // Role update - manager only
    if (role !== undefined && isManager) {
      if (!['manager', 'member'].includes(role)) {
        return NextResponse.json(
          { error: 'Papel inválido' },
          { status: 400 }
        )
      }
      data.role = role
    }

    // Active toggle - manager only
    if (active !== undefined && isManager) {
      // Can't deactivate yourself
      if (!active && currentUser.id === id) {
        return NextResponse.json(
          { error: 'Você não pode desativar sua própria conta' },
          { status: 400 }
        )
      }
      data.active = active
    }

    // Password change
    if (password !== undefined) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'A nova senha deve ter pelo menos 6 caracteres' },
          { status: 400 }
        )
      }

      if (isManager && !isSelf) {
        // Manager resetting someone else's password - no currentPassword needed
        data.password = await hash(password, 10)
      } else {
        // User changing their own password - currentPassword required
        if (!currentPassword) {
          return NextResponse.json(
            { error: 'Senha atual é obrigatória para alterar a senha' },
            { status: 400 }
          )
        }

        const passwordMatch = await compare(currentPassword, user.password)
        if (!passwordMatch) {
          return NextResponse.json(
            { error: 'Senha atual incorreta' },
            { status: 400 }
          )
        }

        data.password = await hash(password, 10)
      }
    }

    const updatedUser = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        _count: {
          select: { leads: true },
        },
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    return authErrorResponse(error)
  }
}

// DELETE /api/users/[id] - Delete a user (manager only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized()
    const currentUser = await requireManager()
    const { id } = await params

    if (currentUser.id === id) {
      return NextResponse.json(
        { error: 'Você não pode excluir sua própria conta' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Check query param for permanent delete
    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get('permanent') === 'true'

    if (permanent) {
      // Reassign leads to the requesting manager before deleting user
      await db.lead.updateMany({
        where: { userId: id },
        data: { userId: currentUser.id },
      })
      // Permanently delete the user
      await db.user.delete({ where: { id } })
      return NextResponse.json({ success: true, message: 'Usuário excluído permanentemente. Leads foram transferidos para você.' })
    }

    // Default: soft delete (deactivate)
    await db.user.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ success: true, message: 'Usuário desativado com sucesso' })
  } catch (error) {
    return authErrorResponse(error)
  }
}
