import { PrismaClient } from '@prisma/client';
import { BotContext } from '../types';

const prisma = new PrismaClient();

export async function handleCases(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.answerCbQuery('❌ Пользователь не найден');
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      include: {
        referrals: true
      }
    });

    if (!user) {
      await ctx.answerCbQuery('❌ Пользователь не найден');
      return;
    }

    // Check if user invited 3+ friends today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayReferrals = await prisma.user.count({
      where: {
        referrerId: user.id,
        createdAt: {
          gte: today
        }
      }
    });

    // Check if user already opened case today
    const hasOpenedCaseToday = user.lastCaseDate && user.lastCaseDate >= today;

    if (todayReferrals < 3) {
      const casesText = `📦 Кейсы

❌ Недостаточно рефералов для открытия кейса

📋 Требования:
• Пригласить 3+ друзей за сегодня
• 1 кейс в день

👥 Приглашено сегодня: ${todayReferrals}/3

🌟 Пригласите ещё ${3 - todayReferrals} друзей, чтобы открыть кейс!`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🌟 Получить звёзды', callback_data: 'get_stars' }],
          [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
        ]
      };

      await ctx.editMessageText(casesText, { reply_markup: keyboard });
      return;
    }

    if (hasOpenedCaseToday) {
      const casesText = `📦 Кейсы

⏰ Вы уже открывали кейс сегодня!

📅 Следующий кейс: завтра
👥 Приглашено сегодня: ${todayReferrals}/3 ✅

Продолжайте приглашать друзей!`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🌟 Получить звёзды', callback_data: 'get_stars' }],
          [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
        ]
      };

      await ctx.editMessageText(casesText, { reply_markup: keyboard });
      return;
    }

    // User can open case
    const casesText = `📦 Кейсы

🎉 Поздравляем! Вы можете открыть кейс!

👥 Приглашено сегодня: ${todayReferrals}/3 ✅

🎁 В кейсе могут быть:
• 1-10 ⭐ (обычная награда)
• 15-25 ⭐ (редкая награда)
• 50-100 ⭐ (эпическая награда)

Готовы открыть кейс?`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🎁 Открыть кейс!', callback_data: 'open_case' }],
        [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
      ]
    };

    await ctx.editMessageText(casesText, { reply_markup: keyboard });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in handleCases:', error);
    await ctx.answerCbQuery('❌ Ошибка загрузки кейсов');
  }
}

// Handle case opening
export async function handleOpenCase(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.answerCbQuery('❌ Пользователь не найден');
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id }
    });

    if (!user) {
      await ctx.answerCbQuery('❌ Пользователь не найден');
      return;
    }

    // Check if user already opened case today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (user.lastCaseDate && user.lastCaseDate >= today) {
      await ctx.answerCbQuery('❌ Вы уже открывали кейс сегодня!');
      return;
    }

    // Generate random reward
    const random = Math.random();
    let reward: number;
    let rarity: string;

    if (random < 0.7) { // 70% - обычная награда
      reward = Math.floor(Math.random() * 10) + 1; // 1-10
      rarity = '⚪ Обычная';
    } else if (random < 0.95) { // 25% - редкая награда
      reward = Math.floor(Math.random() * 11) + 15; // 15-25
      rarity = '🔵 Редкая';
    } else { // 5% - эпическая награда
      reward = Math.floor(Math.random() * 51) + 50; // 50-100
      rarity = '🟣 Эпическая';
    }

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { increment: reward },
        casesOpened: { increment: 1 },
        lastCaseDate: new Date()
      }
    });

    const resultText = `🎁 Кейс открыт!

${rarity} награда!
💰 Получено: ${reward} ⭐

💫 Новый баланс: ${(user.balance + reward).toFixed(2)} ⭐

🎉 Всего кейсов открыто: ${user.casesOpened + 1}

Приглашайте ещё друзей, чтобы завтра снова открыть кейс!`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🌟 Получить звёзды', callback_data: 'get_stars' }],
        [{ text: '👤 Профиль', callback_data: 'profile' }],
        [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
      ]
    };

    await ctx.editMessageText(resultText, { reply_markup: keyboard });
    await ctx.answerCbQuery(`🎉 Получено ${reward} ⭐!`);
  } catch (error) {
    console.error('Error in handleOpenCase:', error);
    await ctx.answerCbQuery('❌ Ошибка открытия кейса');
  }
}
