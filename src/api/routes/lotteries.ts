import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Получение списка всех лотерей
router.get('/', async (req: Request, res: Response) => {
  try {
    const lotteries = await prisma.lottery.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { tickets: true }
        }
      }
    });

    const formattedLotteries = lotteries.map(lottery => ({
      id: lottery.id,
      название: lottery.title,
      описание: lottery.description,
      ценаБилета: lottery.ticketPrice,
      всегоБилетов: lottery.totalTickets,
      проданоБилетов: lottery.soldTickets,
      комиссия: lottery.commission,
      призовойФонд: lottery.prizePool,
      активна: lottery.isActive,
      автоВыбор: lottery.autoWinner,
      датаОкончания: lottery.endDate,
      победительВыбран: lottery.winnerSelected,
      датаСоздания: lottery.createdAt,
      участников: lottery._count.tickets
    }));

    res.json(formattedLotteries);
  } catch (error) {
    console.error('Ошибка получения лотерей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание новой лотереи
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      название, 
      описание, 
      ценаБилета, 
      всегоБилетов, 
      комиссия, 
      автоВыбор,
      датаОкончания
    } = req.body;

    if (!название || !описание || !ценаБилета || !всегоБилетов || !комиссия) {
      return res.status(400).json({ 
        error: 'Все поля обязательны для заполнения' 
      });
    }

    const lottery = await prisma.lottery.create({
      data: {
        title: название,
        description: описание,
        ticketPrice: ценаБилета,
        totalTickets: всегоБилетов,
        commission: комиссия,
        autoWinner: автоВыбор !== undefined ? автоВыбор : true,
        endDate: датаОкончания ? new Date(датаОкончания) : null
      }
    });

    res.json({
      успех: true,
      сообщение: 'Лотерея создана',
      лотерея: {
        id: lottery.id,
        название: lottery.title,
        описание: lottery.description,
        ценаБилета: lottery.ticketPrice,
        всегоБилетов: lottery.totalTickets,
        комиссия: lottery.commission,
        активна: lottery.isActive,
        автоВыбор: lottery.autoWinner,
        датаОкончания: lottery.endDate
      }
    });
  } catch (error) {
    console.error('Ошибка создания лотереи:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение информации о конкретной лотерее
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lottery = await prisma.lottery.findUnique({
      where: { id },
      include: {
        tickets: {
          include: {
            user: {
              select: {
                firstName: true,
                username: true,
                telegramId: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!lottery) {
      return res.status(404).json({ error: 'Лотерея не найдена' });
    }

    // Получаем информацию о победителе, если есть
    let победитель = null;
    if (lottery.winnerId) {
      const winner = await prisma.user.findUnique({
        where: { id: lottery.winnerId },
        select: {
          firstName: true,
          username: true,
          telegramId: true
        }
      });
      победитель = winner;
    }

    const lotteryInfo = {
      id: lottery.id,
      название: lottery.title,
      описание: lottery.description,
      ценаБилета: lottery.ticketPrice,
      всегоБилетов: lottery.totalTickets,
      проданоБилетов: lottery.soldTickets,
      комиссия: lottery.commission,
      призовойФонд: lottery.prizePool,
      активна: lottery.isActive,
      автоВыбор: lottery.autoWinner,
      датаОкончания: lottery.endDate,
      победительВыбран: lottery.winnerSelected,
      победитель: победитель,
      датаСоздания: lottery.createdAt,
      участники: lottery.tickets.map(ticket => ({
        имя: ticket.user.firstName,
        username: ticket.user.username,
        telegramId: ticket.user.telegramId,
        датаПокупки: ticket.createdAt
      }))
    };

    res.json(lotteryInfo);
  } catch (error) {
    console.error('Ошибка получения лотереи:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Завершение лотереи
router.post('/:id/finish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { победительId } = req.body;

    const lottery = await prisma.lottery.findUnique({
      where: { id },
      include: {
        tickets: {
          include: { user: true }
        }
      }
    });

    if (!lottery) {
      return res.status(404).json({ error: 'Лотерея не найдена' });
    }

    if (!lottery.isActive) {
      return res.status(400).json({ error: 'Лотерея уже завершена' });
    }

    if (lottery.tickets.length === 0) {
      return res.status(400).json({ error: 'Нет участников в лотер��е' });
    }

    let winnerId: string;

    // Выбираем победителя
    if (победительId) {
      // Ручной выбор
      const ticket = lottery.tickets.find(t => t.userId === победительId);
      if (!ticket) {
        return res.status(400).json({ error: 'Указанный пользователь не участвует в лотерее' });
      }
      winnerId = победительId;
    } else {
      // Автоматический выбор
      const randomIndex = Math.floor(Math.random() * lottery.tickets.length);
      winnerId = lottery.tickets[randomIndex].userId;
    }

    // Рассчитываем приз (без комиссии)
    const totalPrize = lottery.prizePool * (1 - lottery.commission / 100);

    // Обновляем лотерею и начисляем приз
    await prisma.$transaction([
      prisma.lottery.update({
        where: { id },
        data: {
          winnerId,
          winnerSelected: true,
          isActive: false
        }
      }),
      prisma.user.update({
        where: { id: winnerId },
        data: {
          balance: { increment: totalPrize }
        }
      })
    ]);

    // Получаем информацию о победителе
    const winner = await prisma.user.findUnique({
      where: { id: winnerId },
      select: {
        firstName: true,
        username: true,
        telegramId: true
      }
    });

    res.json({
      успех: true,
      сообщение: 'Лотерея завершена',
      победитель: winner,
      приз: totalPrize
    });
  } catch (error) {
    console.error('Ошибка завершения лотереи:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удаление лотереи
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lottery = await prisma.lottery.findUnique({
      where: { id },
      include: {
        tickets: {
          include: { user: true }
        }
      }
    });

    if (!lottery) {
      return res.status(404).json({ error: 'Лотерея не найдена' });
    }

    // Если есть участники, возвращаем деньги
    if (lottery.tickets.length > 0) {
      for (const ticket of lottery.tickets) {
        await prisma.user.update({
          where: { id: ticket.userId },
          data: {
            balance: { increment: lottery.ticketPrice }
          }
        });
      }
    }

    await prisma.lottery.delete({
      where: { id }
    });

    res.json({
      успех: true,
      сообщение: 'Лотерея удалена, средства возвращены участникам'
    });
  } catch (error) {
    console.error('Ошибка удаления лотереи:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Активация/деактивация лотереи
router.post('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lottery = await prisma.lottery.findUnique({
      where: { id }
    });

    if (!lottery) {
      return res.status(404).json({ error: 'Лотерея не найдена' });
    }

    const updatedLottery = await prisma.lottery.update({
      where: { id },
      data: { isActive: !lottery.isActive }
    });

    res.json({
      успех: true,
      сообщение: updatedLottery.isActive ? 'Лотерея активирована' : 'Лотерея деактивирована',
      активна: updatedLottery.isActive
    });
  } catch (error) {
    console.error('Ошибка изменения статуса лотереи:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export { router as lotteriesRoutes };
