import { hash } from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed test users
  const users = [
    {
      name: 'Ricardo Silva',
      email: 'ricardo@leadprospect.com',
      password: 'gestor123',
      role: 'manager',
    },
    {
      name: 'Ana Santos',
      email: 'ana@leadprospect.com',
      password: 'membro123',
      role: 'member',
    },
    {
      name: 'Bruno Oliveira',
      email: 'bruno@leadprospect.com',
      password: 'membro123',
      role: 'member',
    },
  ]

  for (const user of users) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!existing) {
      const hashedPassword = await hash(user.password, 10)
      await prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          password: hashedPassword,
          role: user.role,
        },
      })
      console.log(`Created user: ${user.email} (${user.role})`)
    } else {
      console.log(`User already exists: ${user.email}`)
    }
  }

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
