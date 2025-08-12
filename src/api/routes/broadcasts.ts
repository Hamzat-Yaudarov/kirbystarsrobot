import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Telegraf } from 'telegraf';

const router = Router();
const prisma = new PrismaClient();

// Получение списка всех рассылок
router.get('/', async (req: Request, res: Response) => {
  try {
    const broadcasts = await prisma.broadcast.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const formattedBroadcasts = broadcasts.map(broadcast => ({
      id: broadcast.id,
      заголовок: broadcast.title,
      содержание: broadcast.content,
      кнопки: broadcast.buttons,
      отправлена: broadcast.sent,
      количествоОтправлений: broadcast.sentCount,
      датаСоздания: broadcast.createdAt,
      датаОтправки: broadcast.sentAt
    }));

    res.json(formattedBroadcasts);
  } catch (error) {
    console.error('Ошибка получения рассылок:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание новой рассылки
router.post('/', async (req: Request, res: Response) => {
  try {
    const { заголовок, содержание, кнопки } = req.body;

    if (!заголовок || !содержание) {
      return res.status(400).json({ 
        error: 'Заголовок и содержание обязательны' 
      });
    }

    // Валидация кнопок, если они есть
    let parsedButtons = null;
    if (кнопки) {
      try {
        parsedButtons = typeof кнопки === 'string' ? JSON.parse(кнопки) : кнопки;
        
        // Проверяем структуру кнопок
        if (!Array.isArray(parsedButtons)) {
          throw new Error('Кнопки должны быть массивом');
        }
        
        for (const row of parsedButtons) {
          if (!Array.isArray(row)) {
            throw new Error('Каждый ряд кнопок должен быть массивом');
          }
          
          for (const button of row) {
            if (!button.text || (!button.callback_data && !button.url)) {
              throw new Error('Каждая кнопка должна иметь text и callback_data или url');
            }
          }
        }
      } catch (error) {
        return res.status(400).json({ 
          error: 'Неверный формат кнопок: ' + error 
        });
      }
    }

    const broadcast = await prisma.broadcast.create({
      data: {
        title: заголовок,
        content: содержание,
        buttons: parsedButtons
      }
    });

    res.json({
      успех: true,
      сообщение: 'Рассылка создана',
      рассылка: {
        id: broadcast.id,
        заголовок: broadcast.title,
        содержание: broadcast.content,
        кнопки: broadcast.buttons,
        отправлена: broadcast.sent
      }
    });
  } catch (error) {
    console.error('Ошибка создания рассылки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение информации о конкретной рассылке
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const broadcast = await prisma.broadcast.findUnique({
      where: { id }
    });

    if (!broadcast) {
      return res.status(404).json({ error: 'Рассылка не найдена' });
    }

    const broadcastInfo = {
      id: broadcast.id,
      заголовок: broadcast.title,
      содержание: broadcast.content,
      кнопки: broadcast.buttons,
      отправлена: broadcast.sent,
      количествоОтправлений: broadcast.sentCount,
      датаСоздания: broadcast.createdAt,
      датаОтправки: broadcast.sentAt
    };

    res.json(broadcastInfo);
  } catch (error) {
    console.error('Ошибка получения рассылки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Редактирование рассылки
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { заголовок, содержание, кнопки } = req.body;

    const broadcast = await prisma.broadcast.findUnique({
      where: { id }
    });

    if (!broadcast) {
      return res.status(404).json({ error: 'Рассылка не найдена' });
    }

    if (broadcast.sent) {
      return res.status(400).json({ 
        error: 'Нельзя редактировать уже отправленную рассылку' 
      });
    }

    const updateData: any = {};
    if (заголовок) updateData.title = заголовок;
    if (содержание) updateData.content = содержание;
    
    if (кнопки !== undefined) {
      if (кнопки) {
        try {
          const parsedButtons = typeof кнопки === 'string' ? JSON.parse(кнопки) : кнопки;
          updateData.buttons = parsedButtons;
        } catch (error) {
          return res.status(400).json({ 
            error: 'Неверный формат кнопок' 
          });
        }
      } else {
        updateData.buttons = null;
      }
    }

    const updatedBroadcast = await prisma.broadcast.update({
      where: { id },
      data: updateData
    });

    res.json({
      успех: true,
      сообщение: 'Рассылка обновлена',
      рассылка: {
        id: updatedBroadcast.id,
        заголовок: updatedBroadcast.title,
        содержание: updatedBroadcast.content,
        кнопки: updatedBroadcast.buttons,
        отправлена: updatedBroadcast.sent
      }
    });
  } catch (error) {
    console.error('Ошибка редактирования рассылки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Отправка рассылки
router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const broadcast = await prisma.broadcast.findUnique({
      where: { id }
    });

    if (!broadcast) {
      return res.status(404).json({ error: 'Рассылка не найдена' });
    }

    if (broadcast.sent) {
      return res.status(400).json({ 
        error: 'Рассылка уже была отправлена' 
      });
    }

    // Получаем всех активных пользователей
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        isBanned: false
      },
      select: {
        telegramId: true
      }
    });

    // Инициализируем бота
    const bot = new Telegraf(process.env.BOT_TOKEN!);

    let sentCount = 0;
    const batchSize = 10; // Отправляем по 10 сообщений одновременно
    
    // Разделяем пользователей на батчи
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const promises = batch.map(async (user) => {
        try {
          const messageOptions: any = {};
          
          if (broadcast.buttons) {
            messageOptions.reply_markup = {
              inline_keyboard: broadcast.buttons
            };
          }

          await bot.telegram.sendMessage(
            user.telegramId,
            broadcast.content,
            messageOptions
          );
          
          return true;
        } catch (error) {
          console.error(`Ошибка отправки пользователю ${user.telegramId}:`, error);
          return false;
        }
      });

      const results = await Promise.all(promises);
      sentCount += results.filter(result => result).length;

      // Небольшая задержка между батчами
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Обновляем статистику рассылки
    await prisma.broadcast.update({
      where: { id },
      data: {
        sent: true,
        sentCount,
        sentAt: new Date()
      }
    });

    res.json({
      успех: true,
      сообщение: 'Рассылка отправлена',
      отправлено: sentCount,
      всегоПользователей: users.length
    });
  } catch (error) {
    console.error('Ошибка отправки рассылки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удаление рассылки
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.broadcast.delete({
      where: { id }
    });

    res.json({
      успех: true,
      сообщение: 'Рассылка удалена'
    });
  } catch (error) {
    console.error('Ошибка удаления рассылки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export { router as broadcastsRoutes };
