import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function createDefaultAdmin() {
  try {
    const existingAdmin = await prisma.admin.findFirst({
      where: { username: process.env.ADMIN_USERNAME || 'admin' }
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
      
      await prisma.admin.create({
        data: {
          username: process.env.ADMIN_USERNAME || 'admin',
          password: hashedPassword,
          role: 'admin'
        }
      });
      
      console.log('✅ Default admin created');
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error);
  }
}

export async function createDefaultPets() {
  try {
    const existingPets = await prisma.pet.count();
    
    if (existingPets === 0) {
      const defaultPets = [
        {
          name: 'Котик-Кликер',
          description: 'Увеличивает доход от кликов на 0.05 звезд',
          price: 50,
          boostType: 'click',
          boostValue: 0.05
        },
        {
          name: 'Собака-Референт',
          description: 'Увеличивает доход от рефералов 1 уровня на 1 звезду',
          price: 100,
          boostType: 'referral1',
          boostValue: 1
        },
        {
          name: 'Хомяк-Помощник',
          description: 'Увеличивает доход от заданий на 0.5 звезд',
          price: 75,
          boostType: 'task',
          boostValue: 0.5
        },
        {
          name: 'Попугай-Промоутер',
          description: 'Увеличивает доход от рефералов 2 уровня на 0.02 звезды',
          price: 150,
          boostType: 'referral2',
          boostValue: 0.02
        }
      ];

      for (const pet of defaultPets) {
        await prisma.pet.create({ data: pet });
      }
      
      console.log('✅ Default pets created');
    }
  } catch (error) {
    console.error('❌ Error creating default pets:', error);
  }
}

export async function createDefaultBroadcasts() {
  try {
    const existingBroadcasts = await prisma.broadcast.count();
    
    if (existingBroadcasts === 0) {
      const defaultBroadcasts = [
        {
          title: 'Еженедельный рейтинг',
          content: '🏆 Попади в топ за неделю и получай призы!\n\n🥇 №1 - 100 звезд\n🥈 №2 - 75 звезд\n🥉 №3 - 50 звезд\n🏅 №4 - 25 звезд\n🎖 №5 - 15 звезд\n\nПриглашай друзей и побеждай!',
          buttons: JSON.stringify([
            [{ text: '📊 Рейтинг', callback_data: 'ratings' }],
            [{ text: '🌟 Получить звёзды', callback_data: 'get_stars' }]
          ])
        },
        {
          title: 'Добро пожаловать!',
          content: '🎉 Добро пожаловать в бота для заработка Telegram Stars!\n\n💰 Зарабатывайте звёзды:\n• Кликайте каждый день\n• Выполняйте задания\n• Приглашайте друзей\n• Покупайте питомцев\n• Участвуйте в лотереях\n\nНачни прямо сейчас!',
          buttons: JSON.stringify([
            [{ text: '👤 Профиль', callback_data: 'profile' }],
            [{ text: '📋 Задания', callback_data: 'tasks' }]
          ])
        }
      ];

      for (const broadcast of defaultBroadcasts) {
        await prisma.broadcast.create({ data: broadcast });
      }
      
      console.log('✅ Default broadcasts created');
    }
  } catch (error) {
    console.error('❌ Error creating default broadcasts:', error);
  }
}
