import { Telegraf, Context, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import { createDefaultPets, createDefaultBroadcasts } from '../utils/setup';
import { BotContext } from './types';
import { handleStart } from './handlers/start';
import { handleProfile } from './handlers/profile';
import { handleClick } from './handlers/click';
import { handleTasks } from './handlers/tasks';
import { handleGetStars } from './handlers/getStars';
import { handleCases } from './handlers/cases';
import { handlePets } from './handlers/pets';
import { handleRatings } from './handlers/ratings';
import { handleLotteries } from './handlers/lotteries';
import { handlePromocode } from './handlers/promocode';
import { handleWithdrawal } from './handlers/withdrawal';
import { checkMandatoryChannels } from './middleware/checkChannels';

const prisma = new PrismaClient();

export async function setupBot(): Promise<Telegraf<BotContext>> {
  const bot = new Telegraf<BotContext>(process.env.BOT_TOKEN!);

  // Middleware to add user to context
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      let user = await prisma.user.findUnique({
        where: { telegramId: ctx.from.id.toString() }
      });

      if (!user) {
        // Extract referral code from start parameter
        let referrerId = null;
        if (ctx.message && 'text' in ctx.message) {
          const text = ctx.message.text;
          if (text.startsWith('/start ')) {
            const referralCode = text.split(' ')[1];
            const referrer = await prisma.user.findUnique({
              where: { referralCode }
            });
            if (referrer && referrer.telegramId !== ctx.from.id.toString()) {
              referrerId = referrer.id;
            }
          }
        }

        user = await prisma.user.create({
          data: {
            telegramId: ctx.from.id.toString(),
            username: ctx.from.username,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name,
            referrerId
          }
        });

        // Award referral bonus
        if (referrerId) {
          await prisma.user.update({
            where: { id: referrerId },
            data: {
              balance: { increment: 3 },
              weeklyReferrals: { increment: 1 }
            }
          });

          // Check for second level referral
          const referrer = await prisma.user.findUnique({
            where: { id: referrerId },
            select: { referrerId: true }
          });

          if (referrer?.referrerId) {
            await prisma.user.update({
              where: { id: referrer.referrerId },
              data: {
                balance: { increment: 0.05 }
              }
            });
          }
        }
      }

      ctx.user = user;
    }
    return next();
  });

  // Commands
  bot.start(handleStart);

  // Promocode command
  bot.command('promo', async (ctx) => {
    const code = ctx.message.text.split(' ')[1];
    if (code) {
      const { handlePromoCommand } = await import('./handlers/promocode');
      await handlePromoCommand(ctx, code);
    } else {
      await ctx.reply('❌ Неверный формат. Используйте: /promo CODE');
    }
  });

  // Main menu buttons
  bot.action('profile', checkMandatoryChannels, handleProfile);
  bot.action('click', checkMandatoryChannels, handleClick);
  bot.action('tasks', checkMandatoryChannels, handleTasks);
  bot.action('get_stars', checkMandatoryChannels, handleGetStars);
  bot.action('cases', checkMandatoryChannels, handleCases);
  bot.action('pets', checkMandatoryChannels, handlePets);
  bot.action('ratings', checkMandatoryChannels, handleRatings);
  bot.action('lotteries', checkMandatoryChannels, handleLotteries);
  bot.action('promocode', checkMandatoryChannels, handlePromocode);
  bot.action('withdrawal', checkMandatoryChannels, handleWithdrawal);

  // Cases actions
  bot.action('open_case', checkMandatoryChannels, async (ctx) => {
    const { handleOpenCase } = await import('./handlers/cases');
    await handleOpenCase(ctx);
  });

  // Pets actions
  bot.action(/^pets/, checkMandatoryChannels, handlePets);
  bot.action(/^buy_pet_/, checkMandatoryChannels, handlePets);
  bot.action(/^pet_info_/, checkMandatoryChannels, handlePets);
  bot.action(/^upgrade_pet_/, checkMandatoryChannels, handlePets);

  // Lotteries actions
  bot.action(/^lotteries/, checkMandatoryChannels, handleLotteries);
  bot.action(/^lottery_info_/, checkMandatoryChannels, handleLotteries);
  bot.action(/^buy_ticket_/, checkMandatoryChannels, handleLotteries);

  // Withdrawal actions
  bot.action(/^withdrawal/, checkMandatoryChannels, handleWithdrawal);
  bot.action(/^withdraw_/, checkMandatoryChannels, handleWithdrawal);
  bot.action('insufficient_balance', async (ctx) => {
    await ctx.answerCbQuery('❌ Недостаточно звёзд для вывода');
  });

  // Task checking
  bot.action(/^check_task_/, checkMandatoryChannels, async (ctx) => {
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const taskId = ctx.callbackQuery.data.replace('check_task_', '');
      const { checkTask } = await import('./handlers/tasks');
      await checkTask(ctx, taskId);
    }
  });

  // Withdrawal admin actions
  bot.action(/^approve_/, async (ctx) => {
    const callbackQuery = ctx.callbackQuery;
    if (callbackQuery && 'data' in callbackQuery) {
      const withdrawalId = callbackQuery.data?.replace('approve_', '');
      if (withdrawalId) {
        const { handleWithdrawalAction } = await import('./handlers/withdrawal');
        await handleWithdrawalAction(ctx, 'approve', withdrawalId);
      }
    }
  });

  bot.action(/^reject_/, async (ctx) => {
    const callbackQuery = ctx.callbackQuery;
    if (callbackQuery && 'data' in callbackQuery) {
      const withdrawalId = callbackQuery.data?.replace('reject_', '');
      if (withdrawalId) {
        const { handleWithdrawalAction } = await import('./handlers/withdrawal');
        await handleWithdrawalAction(ctx, 'reject', withdrawalId);
      }
    }
  });

  // Back to menu
  bot.action('back_to_menu', async (ctx) => {
    await ctx.editMessageText('🌟 Главное меню', {
      reply_markup: getMainMenuKeyboard()
    });
  });

  // Initialize default data
  await createDefaultPets();
  await createDefaultBroadcasts();

  // Set webhook
  if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
    await bot.telegram.setWebhook(process.env.WEBHOOK_URL);
    console.log('✅ Webhook set successfully');
  } else {
    // Development mode - polling
    bot.launch();
    console.log('🤖 Bot started in polling mode');
  }

  return bot;
}

export function getMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '👤 Профиль', callback_data: 'profile' },
        { text: '👆 Кликнуть', callback_data: 'click' }
      ],
      [
        { text: '📋 Задания', callback_data: 'tasks' },
        { text: '🌟 Получить звёзды', callback_data: 'get_stars' }
      ],
      [
        { text: '📦 Кейс', callback_data: 'cases' },
        { text: '🐾 Питомцы', callback_data: 'pets' }
      ],
      [
        { text: '📊 Рейтинги', callback_data: 'ratings' },
        { text: '🎰 Лотереи', callback_data: 'lotteries' }
      ],
      [
        { text: '🎫 Промокод', callback_data: 'promocode' },
        { text: '💸 Вывод', callback_data: 'withdrawal' }
      ]
    ]
  };
}

export { prisma };
