import { BotContext } from '../types';

export async function handleGetStars(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.answerCbQuery('❌ Пользователь не найден');
    return;
  }

  const botUsername = ctx.botInfo?.username || 'your_bot';
  const referralLink = `https://t.me/${botUsername}?start=${ctx.user.referralCode}`;

  const starsText = `🌟 Получить звёзды

💎 Приглашайте друзей и зарабатывайте:

👥 За каждого приглашённого друга:
💰 +3 ⭐ сразу при регистрации

👥👥 За каждого друга ваших друзей:
💰 +0.05 ⭐ при регистрации

🔗 Ваша реферальная ссылка:
\`${referralLink}\`

📋 Как это работает:
1. Отправьте ссылку друзьям
2. Друг переходит по ссылке и запускает бота
3. Вы автоматически получаете звёзды!

💡 Чем больше друзей пригласите, тем больше заработаете!

📦 Бонус: При приглашении 3+ друзей в день, вы сможете открыть кейс!`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '📊 Мои рефералы', callback_data: 'profile' }],
      [{ text: '📦 Открыть кейс', callback_data: 'cases' }],
      [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
    ]
  };

  try {
    await ctx.editMessageText(starsText, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in handleGetStars:', error);
    await ctx.answerCbQuery('❌ Ошибка загрузки информации');
  }
}
