import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Получение списка всех питомцев
router.get('/', async (req: Request, res: Response) => {
  try {
    const pets = await prisma.pet.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { owners: true }
        }
      }
    });

    const formattedPets = pets.map(pet => ({
      id: pet.id,
      название: pet.name,
      описание: pet.description,
      цена: pet.price,
      типБуста: pet.boostType,
      значениеБуста: pet.boostValue,
      картинка: pet.imageUrl,
      активен: pet.isActive,
      владельцев: pet._count.owners,
      датаСоздания: pet.createdAt
    }));

    res.json(formattedPets);
  } catch (error) {
    console.error('Ошибка получения питомцев:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание нового питомца
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      название, 
      описание, 
      цена, 
      типБуста, 
      значениеБуста, 
      картинка 
    } = req.body;

    if (!название || !описание || !цена || !типБуста || !значениеБуста) {
      return res.status(400).json({ 
        error: 'Все обязательные поля должны быть заполнены' 
      });
    }

    const validBoostTypes = ['click', 'referral1', 'referral2', 'task'];
    if (!validBoostTypes.includes(типБуста)) {
      return res.status(400).json({ 
        error: 'Неверный тип буста. Доступные: ' + validBoostTypes.join(', ')
      });
    }

    const pet = await prisma.pet.create({
      data: {
        name: название,
        description: описание,
        price: цена,
        boostType: типБуста,
        boostValue: значениеБуста,
        imageUrl: картинка || null
      }
    });

    res.json({
      успех: true,
      сообщение: 'Питомец создан',
      питомец: {
        id: pet.id,
        название: pet.name,
        описание: pet.description,
        цена: pet.price,
        типБуста: pet.boostType,
        значениеБуста: pet.boostValue,
        картинка: pet.imageUrl,
        активен: pet.isActive
      }
    });
  } catch (error) {
    console.error('Ошибка создания питомца:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение информации о конкретном питомце
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pet = await prisma.pet.findUnique({
      where: { id },
      include: {
        owners: {
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

    if (!pet) {
      return res.status(404).json({ error: 'Питомец не найден' });
    }

    const petInfo = {
      id: pet.id,
      название: pet.name,
      описание: pet.description,
      цена: pet.price,
      типБуста: pet.boostType,
      значениеБуста: pet.boostValue,
      картинка: pet.imageUrl,
      активен: pet.isActive,
      датаСоздания: pet.createdAt,
      владельцы: pet.owners.map(owner => ({
        имя: owner.user.firstName,
        username: owner.user.username,
        telegramId: owner.user.telegramId,
        уровень: owner.level,
        датаПокупки: owner.createdAt
      }))
    };

    res.json(petInfo);
  } catch (error) {
    console.error('Ошибка получения питомца:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Редактирование питомца
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      название, 
      описание, 
      цена, 
      типБуста, 
      значениеБуста, 
      картинка, 
      активен 
    } = req.body;

    const updateData: any = {};
    if (название) updateData.name = название;
    if (описание) updateData.description = описание;
    if (цена !== undefined) updateData.price = цена;
    if (типБуста) {
      const validBoostTypes = ['click', 'referral1', 'referral2', 'task'];
      if (!validBoostTypes.includes(типБуста)) {
        return res.status(400).json({ 
          error: 'Неверный тип буста. Доступные: ' + validBoostTypes.join(', ')
        });
      }
      updateData.boostType = типБуста;
    }
    if (значениеБуста !== undefined) updateData.boostValue = значениеБуста;
    if (картинка !== undefined) updateData.imageUrl = картинка;
    if (активен !== undefined) updateData.isActive = активен;

    const pet = await prisma.pet.update({
      where: { id },
      data: updateData
    });

    res.json({
      успех: true,
      сообщение: 'Питомец обновлен',
      питомец: {
        id: pet.id,
        название: pet.name,
        описание: pet.description,
        цена: pet.price,
        типБуста: pet.boostType,
        значениеБуста: pet.boostValue,
        картинка: pet.imageUrl,
        активен: pet.isActive
      }
    });
  } catch (error) {
    console.error('Ошибка редактирования питомца:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удаление питомца
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.pet.delete({
      where: { id }
    });

    res.json({
      успех: true,
      сообщение: 'Питомец удален'
    });
  } catch (error) {
    console.error('Ошибка удаления питомца:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Активация/деактивация питомца
router.post('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pet = await prisma.pet.findUnique({
      where: { id }
    });

    if (!pet) {
      return res.status(404).json({ error: 'Питомец не найден' });
    }

    const updatedPet = await prisma.pet.update({
      where: { id },
      data: { isActive: !pet.isActive }
    });

    res.json({
      успех: true,
      сообщение: updatedPet.isActive ? 'Питомец активирован' : 'Питомец деактивирован',
      активен: updatedPet.isActive
    });
  } catch (error) {
    console.error('Ошибка изменения статуса питомца:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export { router as petsRoutes };
