import { PrismaClient } from '@prisma/client';
import { BotContext } from '../types';

const prisma = new PrismaClient();

export async function checkMandatoryChannels(ctx: BotContext, next: () => Promise<void>) {
  if (!ctx.user) {
    await ctx.answerCbQuery('❌ Пользователь не найден');
    return;
  }

  try {
    const requiredChannels = await prisma.requiredChannel.findMany({
      where: { isActive: true }
    });

    if (requiredChannels.length === 0) {
      return next();
    }

    for (const channel of requiredChannels) {
      try {
        const member = await ctx.telegram.getChatMember(channel.chatId, parseInt(ctx.user.telegramId));
        
        if (!['creator', 'administrator', 'member'].includes(member.status)) {
          const keyboard = {
            inline_keyboard: [
              ...requiredChannels.map(ch => ([{
                text: `📢 ${ch.title}`,
                url: ch.link || `https://t.me/${ch.chatId.replace('@', '')}`
              }])),
              [{ text: '✅ Проверить подписку', callback_data: ctx.callbackQuery?.data || 'profile' }]
            ]
          };

          await ctx.editMessageText(
            '⚠️ Для использования бота необходимо подписаться на обязательные каналы:',
            { reply_markup: keyboard }
          );
          await ctx.answerCbQuery('Подпишитесь на все каналы!');
          return;
        }
      } catch (error) {
        console.error(`Error checking channel ${channel.chatId}:`, error);
        // If we can't check the channel, allow access
        continue;
      }
    }

    return next();
  } catch (error) {
    console.error('Error in checkMandatoryChannels:', error);
    return next();
  }
}
