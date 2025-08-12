import { PrismaClient } from '@prisma/client';
import { BotContext, WITHDRAWAL_OPTIONS } from '../types';

const prisma = new PrismaClient();

export async function handleWithdrawal(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.answerCbQuery('❌ Пользователь не найден');
    return;
  }

  const action = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : 'withdrawal';

  if (action === 'withdrawal') {
    await showWithdrawalOptions(ctx);
  } else if (action.startsWith('withdraw_')) {
    const amount = parseInt(action.replace('withdraw_', ''));
    await processWithdrawal(ctx, amount);
  }
}

async function showWithdrawalOptions(ctx: BotContext) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: ctx.user!.id }
    });

    if (!user) {
      await ctx.answerCbQuery('❌ Пользователь не найден');
      return;
    }

    const withdrawalText = `💸 Выв��д звёзд

💰 Ваш баланс: ${user.balance.toFixed(2)} ⭐

🎁 Доступные варианты вывода:

• 15 ⭐ → 15 Telegram Stars
• 25 ⭐ → 25 Telegram Stars  
• 50 ⭐ → 50 Telegram Stars
• 100 ⭐ → 100 Telegram Stars
• 1300 ⭐ → Telegram Premium (3 месяца)

⚠️ Обратите внимание:
• Вывод обрабатывается администратором
• Время обработки: до 24 часов
• При отклонении звёзды возвращаются

Выберите сумму для вывода:`;

    const keyboard = {
      inline_keyboard: [
        ...WITHDRAWAL_OPTIONS.map(option => {
          const canWithdraw = user.balance >= option.cost;
          return [{
            text: `${option.label} ${canWithdraw ? '✅' : '❌'}`,
            callback_data: canWithdraw ? `withdraw_${option.amount}` : 'insufficient_balance'
          }];
        }),
        [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
      ]
    };

    await ctx.editMessageText(withdrawalText, { reply_markup: keyboard });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in showWithdrawalOptions:', error);
    await ctx.answerCbQuery('❌ Ошибка загрузки вариантов вывода');
  }
}

async function processWithdrawal(ctx: BotContext, amount: number) {
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

    const option = WITHDRAWAL_OPTIONS.find(opt => opt.amount === amount);
    if (!option) {
      await ctx.answerCbQuery('❌ Неверная сумма для вывода');
      return;
    }

    if (user.balance < option.cost) {
      await ctx.answerCbQuery('❌ Недостаточно звёзд');
      return;
    }

    // Check for pending withdrawals
    const pendingWithdrawal = await prisma.withdrawal.findFirst({
      where: {
        userId: user.id,
        status: 'pending'
      }
    });

    if (pendingWithdrawal) {
      await ctx.answerCbQuery('❌ У вас уже есть заявка на вывод');
      return;
    }

    // Create withdrawal request
    const withdrawal = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          balance: { decrement: option.cost }
        }
      }),
      prisma.withdrawal.create({
        data: {
          userId: user.id,
          amount: option.amount,
          type: amount === 1300 ? 'premium' : amount.toString(),
          status: 'pending'
        }
      })
    ]);

    // Send notification to withdrawal channel
    await sendWithdrawalNotification(ctx, user, withdrawal[1], option);

    const successText = `✅ Заявка на вывод создана!

💰 Сумма: ${option.label}
📋 ID заявки: ${withdrawal[1].id.slice(-8)}
⏰ Статус: На рассмотрении

💫 Остаток на балансе: ${(user.balance - option.cost).toFixed(2)} ⭐

Ваша заявка отправлена администратору. Ожидайте обработки в течение 24 часов.`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '👤 Профиль', callback_data: 'profile' }],
        [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
      ]
    };

    await ctx.editMessageText(successText, { reply_markup: keyboard });
    await ctx.answerCbQuery('✅ Заявка создана!');
  } catch (error) {
    console.error('Error in processWithdrawal:', error);
    await ctx.answerCbQuery('❌ Ошибка создания заявки');
  }
}

async function sendWithdrawalNotification(ctx: BotContext, user: any, withdrawal: any, option: any) {
  try {
    const notificationText = `🔔 Новая заявка на вывод

👤 Пользователь: ${user.firstName || 'Без имени'}
📱 Username: ${user.username ? '@' + user.username : 'Нет'}
🆔 ID: \`${user.telegramId}\`
🔗 Профиль: [Открыть](tg://user?id=${user.telegramId})

💰 Сумма: ${option.label}
📋 ID заявки: ${withdrawal.id.slice(-8)}
⏰ Время: ${new Date().toLocaleString('ru-RU')}

Выберите действие:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Сделано', callback_data: `approve_${withdrawal.id}` },
          { text: '❌ Отклонить', callback_data: `reject_${withdrawal.id}` }
        ]
      ]
    };

    await ctx.telegram.sendMessage(
      process.env.WITHDRAWAL_CHAT_ID || '@kirbyvivodstars',
      notificationText,
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      }
    );
  } catch (error) {
    console.error('Error sending withdrawal notification:', error);
  }
}

// Handle withdrawal administration
export async function handleWithdrawalAction(ctx: any, action: string, withdrawalId: string) {
  try {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: true }
    });

    if (!withdrawal) {
      await ctx.answerCbQuery('❌ Заявка не найдена');
      return;
    }

    if (withdrawal.status !== 'pending') {
      await ctx.answerCbQuery('❌ Заявка уже обработана');
      return;
    }

    if (action === 'approve') {
      await prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'approved',
          processedAt: new Date()
        }
      });

      // Notify user
      await ctx.telegram.sendMessage(
        withdrawal.user.telegramId,
        `✅ Ваша заявка на вывод одобрена!\n\n💰 Сумма: ${withdrawal.amount} ⭐\n📋 ID: ${withdrawal.id.slice(-8)}\n\nСредства будут отправлены в ближайшее время.`
      );

      await ctx.editMessageText(
        ctx.callbackQuery.message.text + '\n\n✅ ОДОБРЕНО'
      );
      await ctx.answerCbQuery('✅ Заявка одобрена');

    } else if (action === 'reject') {
      // Return stars to user
      await prisma.$transaction([
        prisma.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'rejected',
            processedAt: new Date(),
            reason: 'Откл��нено администратором'
          }
        }),
        prisma.user.update({
          where: { id: withdrawal.userId },
          data: {
            balance: { increment: withdrawal.amount }
          }
        })
      ]);

      // Notify user
      await ctx.telegram.sendMessage(
        withdrawal.user.telegramId,
        `❌ Ваша заявка на вывод отклонена\n\n💰 Сумма: ${withdrawal.amount} ⭐\n📋 ID: ${withdrawal.id.slice(-8)}\n\n💫 Звёзды возвращены на баланс.`
      );

      await ctx.editMessageText(
        ctx.callbackQuery.message.text + '\n\n❌ ОТКЛОНЕНО'
      );
      await ctx.answerCbQuery('❌ Заявка отклонена');
    }
  } catch (error) {
    console.error('Error in handleWithdrawalAction:', error);
    await ctx.answerCbQuery('❌ Ошибка обработки заявки');
  }
}

export { showWithdrawalOptions, processWithdrawal, sendWithdrawalNotification };
