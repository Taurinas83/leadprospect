import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'

export async function GET(req: Request) {
  const email = 'tiagotaurian@gmail.com'
  
  try {
    let user = await db.user.findUnique({ where: { email } })
    
    if (user) {
      if (user.role !== 'manager') {
        await db.user.update({
          where: { email },
          data: { role: 'manager' }
        })
        return NextResponse.json({ success: true, message: 'Usuário atualizado para ADM gestor!' })
      } else {
        return NextResponse.json({ success: true, message: 'Usuário já é ADM gestor!' })
      }
    } else {
      const hashedPassword = await hash('Taurian2026!', 10)
      await db.user.create({
        data: {
          name: 'Tiago Taurian',
          email,
          password: hashedPassword,
          role: 'manager',
          active: true,
        }
      })
      return NextResponse.json({ 
        success: true, 
        message: 'Usuário ADM gestor criado com sucesso!', 
        email, 
        password: 'Taurian2026!' 
      })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
