import { BotContext } from '../types';
import { getMainMenuKeyboard } from '../bot';
import { checkMandatoryChannels } from '../middleware/checkChannels';

export async function handleStart(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.reply('❌ Ошибка регистрации пользователя');
    return;
  }

  const welcomeMessage = `🎉 Добро пожаловать в бота для заработка Telegram Stars!

👋 Привет, ${ctx.user.firstName || 'друг'}!

💰 Зарабатывайте звёзды:
• 👆 Кликайте каждый день (+0.1 ⭐)
• 📋 Выполняйте задания
• 🌟 Приглашайте друзей (+3 ⭐ за каждого)
• 🐾 Покупайте питомцев для бустов
• 🎰 Участвуйте в лотереях
• 📦 Открывайте кейсы

🎯 Выводите заработанные звёзды и получайте Telegram Premium!

Выберите действие:`;

  // Check mandatory channels first
  await checkMandatoryChannels(ctx, async () => {
    await ctx.reply(welcomeMessage, {
      reply_markup: getMainMenuKeyboard()
    });
  });
}
