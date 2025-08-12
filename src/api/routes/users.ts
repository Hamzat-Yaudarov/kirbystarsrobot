import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Получение списка всех пользователей с фильтрацией
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      статус = 'все',
      страница = '1', 
      лимит = '20',
      поиск = ''
    } = req.query;

    const page = parseInt(страница as string);
    const limit = parseInt(лимит as string);
    const skip = (page - 1) * limit;

    let where: any = {};

    // Фильтр по статусу
    switch (статус) {
      case 'активные':
        where.isActive = true;
        where.isBanned = false;
        break;
      case 'неактивные':
        where.isActive = false;
        break;
      case 'за��локированные':
        where.isBanned = true;
        break;
    }

    // Поиск по имени или username
    if (поиск) {
      where.OR = [
        { firstName: { contains: поиск as string, mode: 'insensitive' } },
        { username: { contains: поиск as string, mode: 'insensitive' } },
        { telegramId: { contains: поиск as string } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            referrals: true,
            completedTasks: true,
            pets: true
          }
        }
      }
    });

    const total = await prisma.user.count({ where });

    const formattedUsers = users.map(user => ({
      id: user.id,
      telegramId: user.telegramId,
      имя: user.firstName || 'Без имени',
      username: user.username,
      баланс: user.balance,
      рефералов: user._count.referrals,
      заданийВыполнено: user._count.completedTasks,
      питомцев: user._count.pets,
      активен: user.isActive,
      заблокирован: user.isBanned,
      датаРегистрации: user.createdAt,
      последнийКлик: user.lastClick,
      кейсовОткрыто: user.casesOpened,
      еженедельныеРефералы: user.weeklyReferrals
    }));

    res.json({
      пользователи: formattedUsers,
      всего: total,
      страниц: Math.ceil(total / limit),
      текущаяСтраница: page
    });
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение информации о конкретном пользователе
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        referrals: {
          select: {
            id: true,
            firstName: true,
            username: true,
            createdAt: true
          }
        },
        referrer: {
          select: {
            id: true,
            firstName: true,
            username: true
          }
        },
        completedTasks: {
          include: {
            task: {
              select: {
                title: true,
                reward: true
              }
            }
          }
        },
        pets: {
          include: {
            pet: true
          }
        },
        withdrawals: {
          orderBy: { createdAt: 'desc' }
        },
        usedPromocodes: {
          include: {
            promocode: {
              select: {
                code: true,
                reward: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const userInfo = {
      основнаяИнформация: {
        id: user.id,
        telegramId: user.telegramId,
        имя: user.firstName,
        username: user.username,
        баланс: user.balance,
        активен: user.isActive,
        заблокирован: user.isBanned,
        датаРегистрации: user.createdAt,
        последнийКлик: user.lastClick,
        кейсовОткрыто: user.casesOpened,
        еженедельныеРефералы: user.weeklyReferrals,
        реферальныйКод: user.referralCode
      },
      рефералы: {
        всего: user.referrals.length,
        список: user.referrals.map(ref => ({
          имя: ref.firstName,
          username: ref.username,
          датаПриглашения: ref.createdAt
        }))
      },
      пригласил: user.referrer ? {
        имя: user.referrer.firstName,
        username: user.referrer.username
      } : null,
      задания: user.completedTasks.map(task => ({
        название: task.task.title,
        награда: task.task.reward,
        датаВыполнения: task.claimedAt
      })),
      питомцы: user.pets.map(pet => ({
        название: pet.pet.name,
        уровень: pet.level,
        типБуста: pet.pet.boostType,
        значениеБуста: pet.pet.boostValue
      })),
      выводы: user.withdrawals.map(withdrawal => ({
        сумма: withdrawal.amount,
        тип: withdrawal.type,
        статус: withdrawal.status,
        дата: withdrawal.createdAt,
        причинаОтклонения: withdrawal.reason
      })),
      промокоды: user.usedPromocodes.map(promo => ({
        код: promo.promocode.code,
        награда: promo.promocode.reward,
        датаИспользования: promo.usedAt
      }))
    };

    res.json(userInfo);
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Блокировка пользователя
router.post('/:id/ban', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: { isBanned: true }
    });

    res.json({ 
      успех: true, 
      сообщение: 'Пользователь заблокирован',
      пользователь: {
        id: user.id,
        имя: user.firstName,
        заблокирован: user.isBanned
      }
    });
  } catch (error) {
    console.error('Ошибка блокировки пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Разблокировка пользователя
router.post('/:id/unban', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: { isBanned: false }
    });

    res.json({ 
      успех: true, 
      сообщение: 'Пользователь разблокирован',
      пользователь: {
        id: user.id,
        имя: user.firstName,
        заблокирован: user.isBanned
      }
    });
  } catch (error) {
    console.error('Ошибка разблокировки пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удаление пользователя
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id }
    });

    res.json({ 
      успех: true, 
      сообщение: 'Пользователь удален' 
    });
  } catch (error) {
    console.error('Ошибка удаления пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Изменение баланса пользователя
router.post('/:id/balance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { сумма, операция } = req.body; // операция: 'добавить' или 'установить'

    let updateData: any = {};

    if (операция === 'добавить') {
      updateData = { balance: { increment: сумма } };
    } else if (операция === 'установить') {
      updateData = { balance: сумма };
    } else {
      return res.status(400).json({ error: 'Неверная операция' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData
    });

    res.json({ 
      успех: true, 
      сообщение: 'Баланс обновлен',
      новыйБаланс: user.balance
    });
  } catch (error) {
    console.error('Ошибка изменения баланса:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export { router as usersRoutes };
