import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

router.get('/', async (req: Request, res: Response) => {
  try {
    const promocodes = await prisma.promocode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { usedBy: true }
        }
      }
    })

    const formattedPromocodes = promocodes.map(promo => ({
      id: promo.id,
      код: promo.code,
      награда: promo.reward,
      лимитИспользований: promo.usageLimit,
      использовано: promo._count.usedBy,
      активен: promo.isActive,
      датаСоздания: promo.createdAt
    }))

    res.json(formattedPromocodes)
  } catch (error) {
    console.error('Error getting promocodes:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const { код, награда, лимитИспользований } = req.body

    if (!код || !награда) {
      return res.status(400).json({ error: 'Code and reward required' })
    }

    const existingPromo = await prisma.promocode.findUnique({
      where: { code: код.toUpperCase() }
    })

    if (existingPromo) {
      return res.status(400).json({ error: 'Promocode already exists' })
    }

    const promocode = await prisma.promocode.create({
      data: {
        code: код.toUpperCase(),
        reward: награда,
        usageLimit: лимитИспользований || null
      }
    })

    res.json({
      успех: true,
      сообщение: 'Promocode created',
      промокод: promocode
    })
  } catch (error) {
    console.error('Error creating promocode:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const promocode = await prisma.promocode.findUnique({
      where: { id },
      include: {
        usedBy: {
          include: {
            user: {
              select: {
                firstName: true,
                username: true,
                telegramId: true
              }
            }
          }
        }
      }
    })

    if (!promocode) {
      return res.status(404).json({ error: 'Promocode not found' })
    }

    res.json(promocode)
  } catch (error) {
    console.error('Error getting promocode:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { код, награда, лимитИспользований, активен } = req.body

    const updateData: any = {}
    if (код) updateData.code = код.toUpperCase()
    if (награда !== undefined) updateData.reward = награда
    if (лимитИспользований !== undefined) updateData.usageLimit = лимитИспользований
    if (активен !== undefined) updateData.isActive = активен

    const promocode = await prisma.promocode.update({
      where: { id },
      data: updateData
    })

    res.json({
      успех: true,
      сообщение: 'Promocode updated',
      промокод: promocode
    })
  } catch (error) {
    console.error('Error updating promocode:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    await prisma.promocode.delete({
      where: { id }
    })

    res.json({
      успех: true,
      сообщение: 'Promocode deleted'
    })
  } catch (error) {
    console.error('Error deleting promocode:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const promocode = await prisma.promocode.findUnique({
      where: { id }
    })

    if (!promocode) {
      return res.status(404).json({ error: 'Promocode not found' })
    }

    const updatedPromocode = await prisma.promocode.update({
      where: { id },
      data: { isActive: !promocode.isActive }
    })

    res.json({
      успех: true,
      сообщение: updatedPromocode.isActive ? 'Activated' : 'Deactivated',
      активен: updatedPromocode.isActive
    })
  } catch (error) {
    console.error('Error toggling promocode:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

export { router as promocodesRoutes }
