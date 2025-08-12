import { PrismaClient } from '@prisma/client';
import { BotContext } from '../types';

const prisma = new PrismaClient();

export async function handlePromocode(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.answerCbQuery('❌ Пользователь не найден');
    return;
  }

  const promocodeText = `🎫 Промокоды

💡 Введите промокод для получения бонуса!

📝 Как использовать:
1. Введите команду: /promo CODE
2. Замените CODE на ваш промокод
3. Получите награду!

💰 Примеры:
• /promo WELCOME
• /promo BONUS100
• /promo STARS2024

🔍 Ищите промокоды в наших каналах и у партнёров!`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
    ]
  };

  try {
    await ctx.editMessageText(promocodeText, { reply_markup: keyboard });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in handlePromocode:', error);
    await ctx.answerCbQuery('❌ Ошибка загрузки промокодов');
  }
}

export async function handlePromoCommand(ctx: BotContext, code: string) {
  if (!ctx.user || !code) {
    await ctx.reply('❌ Неверный формат. Используйте: /promo CODE');
    return;
  }

  try {
    const promocode = await prisma.promocode.findUnique({
      where: { 
        code: code.toUpperCase(),
      },
      include: {
        usedBy: {
          where: {
            userId: ctx.user.id
          }
        }
      }
    });

    if (!promocode) {
      await ctx.reply('❌ Промокод не найден или недействителен');
      return;
    }

    if (!promocode.isActive) {
      await ctx.reply('❌ Промокод больше не активен');
      return;
    }

    if (promocode.usedBy.length > 0) {
      await ctx.reply('❌ Вы уже использовали этот промокод');
      return;
    }

    if (promocode.usageLimit && promocode.usedCount >= promocode.usageLimit) {
      await ctx.reply('❌ Промокод исчерпан');
      return;
    }

    // Use promocode
    await prisma.$transaction([
      prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          balance: { increment: promocode.reward }
        }
      }),
      prisma.promocode.update({
        where: { id: promocode.id },
        data: {
          usedCount: { increment: 1 }
        }
      }),
      prisma.userPromocode.create({
        data: {
          userId: ctx.user.id,
          promocodeId: promocode.id
        }
      })
    ]);

    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id }
    });

    const successText = `🎉 Промокод активирован!

🎫 Код: ${promocode.code}
💰 Получено: ${promocode.reward} ⭐
💫 Новый баланс: ${user?.balance.toFixed(2)} ⭐

Спасибо за использование промокода!`;

    await ctx.reply(successText);
  } catch (error) {
    console.error('Error in handlePromoCommand:', error);
    await ctx.reply('❌ Ошибка активации промокода');
  }
}
