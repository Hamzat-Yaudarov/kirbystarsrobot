import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Получение списка всех обязательных каналов
router.get('/', async (req: Request, res: Response) => {
  try {
    const channels = await prisma.requiredChannel.findMany({
      orderBy: { id: 'desc' }
    });

    const formattedChannels = channels.map(channel => ({
      id: channel.id,
      название: channel.title,
      chatId: channel.chatId,
      ссылка: channel.link,
      активен: channel.isActive
    }));

    res.json(formattedChannels);
  } catch (error) {
    console.error('Ошибка получения каналов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание нового обяза��ельного канала
router.post('/', async (req: Request, res: Response) => {
  try {
    const { название, chatId, ссылка } = req.body;

    if (!название || !chatId) {
      return res.status(400).json({ 
        error: 'Название и Chat ID обязательны' 
      });
    }

    // Проверяем, не существует ли уже канал с таким chatId
    const existingChannel = await prisma.requiredChannel.findUnique({
      where: { chatId }
    });

    if (existingChannel) {
      return res.status(400).json({ 
        error: 'Канал с таким Chat ID уже существует' 
      });
    }

    const channel = await prisma.requiredChannel.create({
      data: {
        title: название,
        chatId,
        link: ссылка || null
      }
    });

    res.json({
      успех: true,
      сообщение: 'Обязательный канал добавлен',
      канал: {
        id: channel.id,
        название: channel.title,
        chatId: channel.chatId,
        ссылка: channel.link,
        активен: channel.isActive
      }
    });
  } catch (error) {
    console.error('Ошибка создания канала:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение информации о конкретном канале
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const channel = await prisma.requiredChannel.findUnique({
      where: { id }
    });

    if (!channel) {
      return res.status(404).json({ error: 'Канал не найден' });
    }

    const channelInfo = {
      id: channel.id,
      название: channel.title,
      chatId: channel.chatId,
      ссылка: channel.link,
      активен: channel.isActive
    };

    res.json(channelInfo);
  } catch (error) {
    console.error('Ошибка получения канала:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Редактирование канала
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { название, chatId, ссылка, активен } = req.body;

    // Проверяем, если изменяется chatId, не существует ли уже такой
    if (chatId) {
      const existingChannel = await prisma.requiredChannel.findFirst({
        where: { 
          chatId,
          id: { not: id }
        }
      });

      if (existingChannel) {
        return res.status(400).json({ 
          error: 'Канал с таким Chat ID уже существует' 
        });
      }
    }

    const updateData: any = {};
    if (название) updateData.title = название;
    if (chatId) updateData.chatId = chatId;
    if (ссылка !== undefined) updateData.link = ссылка;
    if (активен !== undefined) updateData.isActive = активен;

    const channel = await prisma.requiredChannel.update({
      where: { id },
      data: updateData
    });

    res.json({
      успех: true,
      сообщение: 'Канал обновлен',
      канал: {
        id: channel.id,
        название: channel.title,
        chatId: channel.chatId,
        ссылка: channel.link,
        активен: channel.isActive
      }
    });
  } catch (error) {
    console.error('Ошибка редактирования канала:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удаление канала
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.requiredChannel.delete({
      where: { id }
    });

    res.json({
      успех: true,
      сообщение: 'Канал удален'
    });
  } catch (error) {
    console.error('Ошибка удаления канала:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Активация/деактивация канала
router.post('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const channel = await prisma.requiredChannel.findUnique({
      where: { id }
    });

    if (!channel) {
      return res.status(404).json({ error: 'Канал не найден' });
    }

    const updatedChannel = await prisma.requiredChannel.update({
      where: { id },
      data: { isActive: !channel.isActive }
    });

    res.json({
      успех: true,
      сообщение: updatedChannel.isActive ? 'Канал активирован' : 'Канал деактивирован',
      активен: updatedChannel.isActive
    });
  } catch (error) {
    console.error('Ошибка изменения статуса канала:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export { router as channelsRoutes };
