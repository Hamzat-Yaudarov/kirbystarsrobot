import { PrismaClient } from '@prisma/client';
import { BotContext } from '../types';

const prisma = new PrismaClient();

export async function handleRatings(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.answerCbQuery('❌ Пользователь не найден');
    return;
  }

  try {
    // Get weekly referral rating
    const topUsers = await prisma.user.findMany({
      where: {
        weeklyReferrals: {
          gt: 0
        }
      },
      orderBy: {
        weeklyReferrals: 'desc'
      },
      take: 10,
      select: {
        id: true,
        firstName: true,
        username: true,
        weeklyReferrals: true
      }
    });

    // Find current user position
    const allUsers = await prisma.user.findMany({
      where: {
        weeklyReferrals: {
          gt: 0
        }
      },
      orderBy: {
        weeklyReferrals: 'desc'
      },
      select: {
        id: true,
        weeklyReferrals: true
      }
    });

    const userPosition = allUsers.findIndex(user => user.id === ctx.user!.id) + 1;
    const userWeeklyReferrals = ctx.user.weeklyReferrals || 0;

    let ratingsText = `📊 Рейтинг по рефералам за неделю

🏆 Призы за топ-5:
🥇 №1 - 100 ⭐
🥈 №2 - 75 ⭐  
🥉 №3 - 50 ⭐
🏅 №4 - 25 ⭐
🎖 №5 - 15 ⭐

📈 Топ-10 игроков:\n`;

    if (topUsers.length === 0) {
      ratingsText += '\n❌ Пока никто не пригласил рефералов на этой неделе';
    } else {
      topUsers.forEach((user, index) => {
        const position = index + 1;
        const emoji = position <= 3 ? ['🥇', '🥈', '🥉'][position - 1] : `${position}.`;
        const name = user.firstName || user.username || 'Аноним';
        ratingsText += `\n${emoji} ${name} - ${user.weeklyReferrals} реф.`;
      });
    }

    if (userPosition > 0) {
      ratingsText += `\n\n👤 Ваша позиция: №${userPosition}`;
      ratingsText += `\n👥 Ваши рефералы: ${userWeeklyReferrals}`;
    } else {
      ratingsText += `\n\n👤 Вы не в рейтинге`;
      ratingsText += `\n💡 Пригласите друзей, чтобы попасть в топ!`;
    }

    ratingsText += `\n\n⏰ Рейтинг обновляется каждый понедельник`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🔄 Обновить', callback_data: 'ratings' }],
        [{ text: '🌟 Получить звёзды', callback_data: 'get_stars' }],
        [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
      ]
    };

    await ctx.editMessageText(ratingsText, { reply_markup: keyboard });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in handleRatings:', error);
    await ctx.answerCbQuery('❌ Ошибка загрузки рейтинга');
  }
}
