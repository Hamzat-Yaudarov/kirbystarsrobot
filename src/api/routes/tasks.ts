import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Получение списка всех заданий
router.get('/', async (req: Request, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { completedBy: true }
        }
      }
    });

    const formattedTasks = tasks.map(task => ({
      id: task.id,
      название: task.title,
      описание: task.description,
      награда: task.reward,
      тип: task.type,
      ссылка: task.link,
      chatId: task.chatId,
      порядок: task.order,
      активно: task.isActive,
      выполнено: task._count.completedBy,
      датаСоздания: task.createdAt
    }));

    res.json(formattedTasks);
  } catch (error) {
    console.error('Ошибка получения заданий:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание нового задания
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      название, 
      описание, 
      награда, 
      тип, 
      ссылка, 
      chatId, 
      порядок 
    } = req.body;

    if (!название || !описание || !награда || !тип || !ссылка) {
      return res.status(400).json({ 
        error: 'Название, описание, награда, тип и ссылка обязательны' 
      });
    }

    const task = await prisma.task.create({
      data: {
        title: название,
        description: описание,
        reward: награда,
        type: тип,
        link: ссылка,
        chatId: chatId || null,
        order: порядок || 0
      }
    });

    res.json({
      успех: true,
      сообщение: 'Задание создано',
      задание: {
        id: task.id,
        название: task.title,
        описание: task.description,
        награда: task.reward,
        тип: task.type,
        ссылка: task.link,
        chatId: task.chatId,
        порядок: task.order,
        активно: task.isActive
      }
    });
  } catch (error) {
    console.error('Ошибка создания задания:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение информации о конкретном задании
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        completedBy: {
          include: {
            user: {
              select: {
                firstName: true,
                username: true,
                telegramId: true
              }
            }
          },
          orderBy: { claimedAt: 'desc' }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Задание не найдено' });
    }

    const taskInfo = {
      id: task.id,
      название: task.title,
      описание: task.description,
      награда: task.reward,
      тип: task.type,
      ссылка: task.link,
      chatId: task.chatId,
      порядок: task.order,
      активно: task.isActive,
      датаСоздания: task.createdAt,
      выполненияПользователей: task.completedBy.map(completion => ({
        имя: completion.user.firstName,
        username: completion.user.username,
        telegramId: completion.user.telegramId,
        датаВыполнения: completion.claimedAt,
        выполнено: completion.completed
      }))
    };

    res.json(taskInfo);
  } catch (error) {
    console.error('Ошибка получения задания:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Редактирование задания
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      название, 
      описание, 
      награда, 
      тип, 
      ссылка, 
      chatId, 
      порядок, 
      активно 
    } = req.body;

    const updateData: any = {};
    if (название) updateData.title = название;
    if (описание) updateData.description = описание;
    if (награда !== undefined) updateData.reward = награда;
    if (тип) updateData.type = тип;
    if (ссылка) updateData.link = ссылка;
    if (chatId !== undefined) updateData.chatId = chatId;
    if (порядок !== undefined) updateData.order = порядок;
    if (активно !== undefined) updateData.isActive = активно;

    const task = await prisma.task.update({
      where: { id },
      data: updateData
    });

    res.json({
      успех: true,
      сообщение: 'Задание обновлено',
      задание: {
        id: task.id,
        название: task.title,
        описание: task.description,
        награда: task.reward,
        тип: task.type,
        ссылка: task.link,
        chatId: task.chatId,
        порядок: task.order,
        активно: task.isActive
      }
    });
  } catch (error) {
    console.error('Ошибка редактирования задания:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удаление задания
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.task.delete({
      where: { id }
    });

    res.json({
      успех: true,
      сообщение: 'Задание удалено'
    });
  } catch (error) {
    console.error('Ошибка удаления задания:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Активация/деактивация задания
router.post('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id }
    });

    if (!task) {
      return res.status(404).json({ error: 'Задание не найдено' });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { isActive: !task.isActive }
    });

    res.json({
      успех: true,
      сообщение: updatedTask.isActive ? 'Задание активировано' : 'Задание деактивировано',
      активно: updatedTask.isActive
    });
  } catch (error) {
    console.error('Ошибка изменения статуса задания:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export { router as tasksRoutes };
