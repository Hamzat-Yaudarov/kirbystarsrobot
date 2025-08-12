import { PrismaClient } from '@prisma/client';
import { BotContext } from '../types';

const prisma = new PrismaClient();

export async function handleClick(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.answerCbQuery('❌ Пользователь не найден');
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      include: {
        pets: {
          include: {
            pet: true
          }
        }
      }
    });

    if (!user) {
      await ctx.answerCbQuery('❌ Пользователь не найден');
      return;
    }

    // Check if user already clicked today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (user.lastClick && user.lastClick >= today) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const hoursLeft = Math.ceil((tomorrow.getTime() - Date.now()) / (1000 * 60 * 60));
      
      await ctx.answerCbQuery(`⏰ Вы уже кликали сегодня! Следующий клик через ${hoursLeft} ч.`);
      return;
    }

    // Calculate base reward + pet boost
    let baseReward = 0.1;
    let clickBoost = 0;

    user.pets.forEach(userPet => {
      if (userPet.pet.boostType === 'click') {
        clickBoost += userPet.pet.boostValue * userPet.level;
      }
    });

    const totalReward = baseReward + clickBoost;

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { increment: totalReward },
        lastClick: new Date()
      }
    });

    const rewardText = `🎉 Успешно!

💰 Получено: ${totalReward.toFixed(3)} ⭐
${clickBoost > 0 ? `├ Базовая награда: ${baseReward} ⭐\n└ Буст питомцев: +${clickBoost.toFixed(3)} ⭐` : ''}

💫 Новый баланс: ${(user.balance + totalReward).toFixed(3)} ⭐

⏰ Следующий клик: завтра`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '👤 Профиль', callback_data: 'profile' }],
        [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
      ]
    };

    await ctx.editMessageText(rewardText, { reply_markup: keyboard });
    await ctx.answerCbQuery('�� Клик засчитан!');
  } catch (error) {
    console.error('Error in handleClick:', error);
    await ctx.answerCbQuery('❌ Ошибка при клике');
  }
}
