import { PrismaClient } from '@prisma/client';
import { BotContext } from '../types';

const prisma = new PrismaClient();

export async function handleProfile(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.answerCbQuery('❌ Пользователь не найден');
    return;
  }

  try {
    // Get user with relations
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      include: {
        referrals: true,
        pets: {
          include: {
            pet: true
          }
        },
        _count: {
          select: {
            referrals: true
          }
        }
      }
    });

    if (!user) {
      await ctx.answerCbQuery('❌ Пользователь не найден');
      return;
    }

    // Count second level referrals
    const secondLevelReferrals = await prisma.user.count({
      where: {
        referrerId: {
          in: user.referrals.map(ref => ref.id)
        }
      }
    });

    // Calculate boosts from pets
    let clickBoost = 0;
    let referral1Boost = 0;
    let referral2Boost = 0;
    let taskBoost = 0;

    user.pets.forEach(userPet => {
      const pet = userPet.pet;
      const boost = pet.boostValue * userPet.level;
      
      switch (pet.boostType) {
        case 'click':
          clickBoost += boost;
          break;
        case 'referral1':
          referral1Boost += boost;
          break;
        case 'referral2':
          referral2Boost += boost;
          break;
        case 'task':
          taskBoost += boost;
          break;
      }
    });

    const profileText = `👤 Ваш профиль

💰 Баланс: ${user.balance.toFixed(2)} ⭐

👥 Рефералы:
├ 1 уровень: ${user._count.referrals} чел.
└ 2 уровень: ${secondLevelReferrals} чел.

🐾 Питомцы: ${user.pets.length}

🚀 Бусты от питомцев:
├ Клики: +${clickBoost.toFixed(2)} ⭐
├ Рефералы 1 ур.: +${referral1Boost.toFixed(2)} ⭐
├ Рефералы 2 ур.: +${referral2Boost.toFixed(3)} ⭐
└ Задания: +${taskBoost.toFixed(2)} ⭐

🔗 Реферальная ссылка:
https://t.me/${ctx.botInfo?.username}?start=${user.referralCode}`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🔄 Обновить', callback_data: 'profile' }],
        [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
      ]
    };

    await ctx.editMessageText(profileText, { reply_markup: keyboard });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in handleProfile:', error);
    await ctx.answerCbQuery('❌ Ошибка загрузки профиля');
  }
}
