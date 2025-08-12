import { PrismaClient } from '@prisma/client';
import { BotContext } from '../types';

const prisma = new PrismaClient();

export async function handleLotteries(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.answerCbQuery('❌ Пользователь не найден');
    return;
  }

  const action = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : 'lotteries';

  if (action === 'lotteries') {
    await showLotteryList(ctx);
  } else if (action.startsWith('lottery_info_')) {
    const lotteryId = action.replace('lottery_info_', '');
    await showLotteryInfo(ctx, lotteryId);
  } else if (action.startsWith('buy_ticket_')) {
    const lotteryId = action.replace('buy_ticket_', '');
    await buyTicket(ctx, lotteryId);
  }
}

async function showLotteryList(ctx: BotContext) {
  try {
    const activeLotteries = await prisma.lottery.findMany({
      where: { 
        isActive: true,
        endDate: {
          gt: new Date()
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (activeLotteries.length === 0) {
      const noLotteriesText = `🎰 Лотереи

❌ Активных лотерей нет

Следите за обновлениями!`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
        ]
      };

      await ctx.editMessageText(noLotteriesText, { reply_markup: keyboard });
      return;
    }

    const lotteriesText = `🎰 Активные лотереи

💡 Купите билет и выиграйте призовой фонд!

Доступные лотереи:`;

    const keyboard = {
      inline_keyboard: [
        ...activeLotteries.map(lottery => {
          const fillPercent = Math.round((lottery.soldTickets / lottery.totalTickets) * 100);
          return [{
            text: `${lottery.title} (${fillPercent}%) - ${lottery.ticketPrice} ⭐`,
            callback_data: `lottery_info_${lottery.id}`
          }];
        }),
        [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
      ]
    };

    await ctx.editMessageText(lotteriesText, { reply_markup: keyboard });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in showLotteryList:', error);
    await ctx.answerCbQuery('❌ Ошибка загрузки лотерей');
  }
}

async function showLotteryInfo(ctx: BotContext, lotteryId: string) {
  try {
    const lottery = await prisma.lottery.findUnique({
      where: { id: lotteryId },
      include: {
        tickets: {
          include: {
            user: {
              select: {
                firstName: true,
                username: true
              }
            }
          }
        }
      }
    });

    if (!lottery) {
      await ctx.answerCbQuery('❌ Лотерея не найдена');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: ctx.user!.id }
    });

    const hasTicket = lottery.tickets.some(ticket => ticket.userId === ctx.user!.id);
    const fillPercent = Math.round((lottery.soldTickets / lottery.totalTickets) * 100);
    const prizePool = lottery.prizePool * (1 - lottery.commission / 100);

    let endTime = '';
    if (lottery.endDate) {
      const now = new Date();
      const end = new Date(lottery.endDate);
      const diff = end.getTime() - now.getTime();
      const hours = Math.ceil(diff / (1000 * 60 * 60));
      endTime = hours > 0 ? `⏰ Завершится через: ${hours} ч.` : '⏰ Завершена';
    }

    const lotteryText = `🎰 ${lottery.title}

📄 ${lottery.description}

💰 Цена билета: ${lottery.ticketPrice} ⭐
🎁 Призовой фонд: ${prizePool.toFixed(2)} ⭐
🎫 Билетов продано: ${lottery.soldTickets}/${lottery.totalTickets} (${fillPercent}%)
${endTime}

${hasTicket ? '✅ У вас есть билет!' : '❌ У вас нет билета'}

💫 Ваш баланс: ${user?.balance.toFixed(2)} ⭐

📊 Участники: ${lottery.tickets.length}`;

    const canBuy = user && user.balance >= lottery.ticketPrice && !hasTicket && lottery.soldTickets < lottery.totalTickets;

    const keyboard = {
      inline_keyboard: [
        ...(canBuy ? [[{ text: '🎫 Купить билет', callback_data: `buy_ticket_${lottery.id}` }]] : []),
        [{ text: '⬅️ К лотереям', callback_data: 'lotteries' }],
        [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
      ]
    };

    await ctx.editMessageText(lotteryText, { reply_markup: keyboard });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in showLotteryInfo:', error);
    await ctx.answerCbQuery('❌ Ошибка загрузки информации о лотерее');
  }
}

async function buyTicket(ctx: BotContext, lotteryId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: ctx.user!.id }
    });

    const lottery = await prisma.lottery.findUnique({
      where: { id: lotteryId }
    });

    if (!user || !lottery) {
      await ctx.answerCbQuery('❌ Ошибка данных');
      return;
    }

    if (user.balance < lottery.ticketPrice) {
      await ctx.answerCbQuery('❌ Недостаточно звёзд');
      return;
    }

    if (lottery.soldTickets >= lottery.totalTickets) {
      await ctx.answerCbQuery('❌ Все билеты распроданы');
      return;
    }

    const hasTicket = await prisma.lotteryTicket.findUnique({
      where: {
        lotteryId_userId: {
          lotteryId: lottery.id,
          userId: user.id
        }
      }
    });

    if (hasTicket) {
      await ctx.answerCbQuery('❌ У вас уже есть билет');
      return;
    }

    // Buy ticket
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          balance: { decrement: lottery.ticketPrice }
        }
      }),
      prisma.lottery.update({
        where: { id: lottery.id },
        data: {
          soldTickets: { increment: 1 },
          prizePool: { increment: lottery.ticketPrice }
        }
      }),
      prisma.lotteryTicket.create({
        data: {
          lotteryId: lottery.id,
          userId: user.id
        }
      })
    ]);

    const successText = `🎉 Билет куплен!

🎰 ${lottery.title}
💰 Потрачено: ${lottery.ticketPrice} ⭐
💫 Остаток: ${(user.balance - lottery.ticketPrice).toFixed(2)} ⭐

🎁 Новый призовой фонд: ${(lottery.prizePool + lottery.ticketPrice).toFixed(2)} ⭐

Удачи в розыгрыше!`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🎰 К лотереям', callback_data: 'lotteries' }],
        [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
      ]
    };

    await ctx.editMessageText(successText, { reply_markup: keyboard });
    await ctx.answerCbQuery('🎉 Билет куплен!');
  } catch (error) {
    console.error('Error in buyTicket:', error);
    await ctx.answerCbQuery('❌ Ошибка покупки билета');
  }
}

export { showLotteryList, showLotteryInfo, buyTicket };
