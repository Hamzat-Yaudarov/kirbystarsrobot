import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Получение списка всех промокодов
router.get('/', async (req: Request, res: Response) => {
  try {
    const promocodes = await prisma.promocode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { usedBy: true }
        }
      }
    });

    const formattedPromocodes = promocodes.map(promo => ({
      id: promo.id,
      код: promo.code,
      награда: promo.reward,
      лимитИспользований: promo.usageLimit,
      использовано: promo._count.usedBy,
      активен: promo.isActive,
      датаСоздания: promo.createdAt,
      остатокИспользований: promo.usageLimit ? promo.usageLimit - promo._count.usedBy : null
    }));

    res.json(formattedPromocodes);
  } catch (error) {
    console.error('Ошибка получения промокодов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание нового промокода
router.post('/', async (req: Request, res: Response) => {
  try {
    const { код, награда, лимитИспользований } = req.body;

    if (!код || !награда) {
      return res.status(400).json({ error: 'Код и награда обязательны' });
    }

    const existingPromo = await prisma.promocode.findUnique({
      where: { code: код.toUpperCase() }
    });

    if (existingPromo) {
      return res.status(400).json({ error: 'Промокод с таким кодом уже существует' });
    }

    const promocode = await prisma.promocode.create({
      data: {
        code: код.toUpperCase(),
        reward: награда,
        usageLimit: лимитИспользований || null
      }
    });

    res.json({
      успех: true,
      сообщение: 'Промокод создан',
      промокод: {
        id: promocode.id,
        код: promocode.code,
        награда: promocode.reward,
        лимитИспользований: promocode.usageLimit,
        активен: promocode.isActive
      }
    });
  } catch (error) {
    console.error('Ошибка создания промокода:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение информации о конкретном промокоде
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

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
          },
          orderBy: { usedAt: 'desc' }
        }
      }
    });

    if (!promocode) {
      return res.status(404).json({ error: 'Промокод не найден' });
    }

    const promoInfo = {
      id: promocode.id,
      код: promocode.code,
      награда: promocode.reward,
      лимитИспользований: promocode.usageLimit,
      использовано: promocode.usedCount,
      активен: promocode.isActive,
      датаСоздания: promocode.createdAt,
      пользователи: promocode.usedBy.map(usage => ({
        имя: usage.user.firstName,
        username: usage.user.username,
        telegramId: usage.user.telegramId,
        датаИспользования: usage.usedAt
      }))
    };

    res.json(promoInfo);
  } catch (error) {
    console.error('Ошибка получения промокода:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Редактирование промокода
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { код, награда, лимитИспользований, активен } = req.body;

    if (код) {
      const existingPromo = await prisma.promocode.findFirst({
        where: { 
          code: код.toUpperCase(),
          id: { not: id }
        }
      });

      if (existingPromo) {
        return res.status(400).json({ error: 'Промокод с таким кодом уже существует' });
      }
    }

    const updateData: any = {};
    if (код) updateData.code = код.toUpperCase();
    if (награда !== undefined) updateData.reward = награда;
    if (лимитИспользований !== undefined) updateData.usageLimit = лимитИспользований;
    if (активен !== undefined) updateData.isActive = активен;

    const promocode = await prisma.promocode.update({
      where: { id },
      data: updateData
    });

    res.json({
      успех: true,
      сообщение: 'Промокод обновлен',
      пром��код: {
        id: promocode.id,
        код: promocode.code,
        награда: promocode.reward,
        лимитИспользований: promocode.usageLimit,
        активен: promocode.isActive
      }
    });
  } catch (error) {
    console.error('Ошибка редактирования промокода:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удаление промокода
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.promocode.delete({
      where: { id }
    });

    res.json({
      успех: true,
      сообщение: 'Промокод удален'
    });
  } catch (error) {
    console.error('Ошибка удаления промокода:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Активация/деактивация промокода
router.post('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const promocode = await prisma.promocode.findUnique({
      where: { id }
    });

    if (!promocode) {
      return res.status(404).json({ error: 'Промокод не найден' });
    }

    const updatedPromocode = await prisma.promocode.update({
      where: { id },
      data: { isActive: !promocode.isActive }
    });

    res.json({
      успех: true,
      сообщение: updatedPromocode.isActive ? 'Промокод активирован' : 'Промокод деактивирован',
      активен: updatedPromocode.isActive
    });
  } catch (error) {
    console.error('Ошибка изменения статуса промокода:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export { router as promocodesRoutes };
