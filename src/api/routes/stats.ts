import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

router.get('/', async (req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.user.count()
    const activeUsers = await prisma.user.count({
      where: { isActive: true, isBanned: false }
    })
    const bannedUsers = await prisma.user.count({
      where: { isBanned: true }
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const newUsersToday = await prisma.user.count({
      where: { createdAt: { gte: today } }
    })

    const clicksToday = await prisma.user.count({
      where: { lastClick: { gte: today } }
    })

    const totalTasks = await prisma.task.count()
    const activeTasks = await prisma.task.count({
      where: { isActive: true }
    })
    const completedTasks = await prisma.userTask.count({
      where: { completed: true }
    })

    const totalPets = await prisma.pet.count()
    const petsSold = await prisma.userPet.count()

    const activeLotteries = await prisma.lottery.count({
      where: { isActive: true }
    })
    const lotteryTicketsSold = await prisma.lotteryTicket.count()

    const totalPromocodes = await prisma.promocode.count()
    const activePromocodes = await prisma.promocode.count({
      where: { isActive: true }
    })
    const promocodesUsed = await prisma.userPromocode.count()

    const pendingWithdrawals = await prisma.withdrawal.count({
      where: { status: 'pending' }
    })
    const approvedWithdrawals = await prisma.withdrawal.count({
      where: { status: 'approved' }
    })
    const rejectedWithdrawals = await prisma.withdrawal.count({
      where: { status: 'rejected' }
    })

    const totalBalance = await prisma.user.aggregate({
      _sum: { balance: true }
    })

    const topReferrers = await prisma.user.findMany({
      take: 5,
      orderBy: { referrals: { _count: 'desc' } },
      select: {
        firstName: true,
        username: true,
        _count: { select: { referrals: true } }
      }
    })

    const dailyStats = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dayUsers = await prisma.user.count({
        where: {
          createdAt: { gte: date, lt: nextDate }
        }
      })

      dailyStats.push({
        date: date.toLocaleDateString('ru-RU'),
        newUsers: dayUsers
      })
    }

    const stats = {
      общее: {
        всегоПользователей: totalUsers,
        активныхПользователей: activeUsers,
        заблокированныхПользователей: bannedUsers,
        общийБалансПользователей: totalBalance._sum.balance || 0
      },
      сегодня: {
        новыхПользователей: newUsersToday,
        кликов: clicksToday
      },
      задания: {
        всегоЗаданий: totalTasks,
        активныхЗаданий: activeTasks,
        выполненныхЗаданий: completedTasks
      },
      питомцы: {
        всегоПитомцев: totalPets,
        продано: petsSold
      },
      лотереи: {
        активныхЛотерей: activeLotteries,
        билетовПродано: lotteryTicketsSold
      },
      промокоды: {
        всегоПромокодов: totalPromocodes,
        активныхПромокодов: activePromocodes,
        использовано: promocodesUsed
      },
      выводы: {
        ожидающие: pendingWithdrawals,
        одобренные: approvedWithdrawals,
        отклоненные: rejectedWithdrawals
      },
      топРефереров: topReferrers,
      статистикаПоДням: dailyStats
    }

    res.json(stats)
  } catch (error) {
    console.error('Error getting stats:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

export { router as statsRoutes }
