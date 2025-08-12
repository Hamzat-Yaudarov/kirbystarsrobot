import { PrismaClient } from '@prisma/client';
import { BotContext } from '../types';

const prisma = new PrismaClient();

export async function handleTasks(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.answerCbQuery('❌ Пользователь не найден');
    return;
  }

  try {
    // Get next available task for user
    const completedTaskIds = await prisma.userTask.findMany({
      where: { userId: ctx.user.id },
      select: { taskId: true }
    });

    const completedIds = completedTaskIds.map(ut => ut.taskId);

    const nextTask = await prisma.task.findFirst({
      where: {
        isActive: true,
        id: {
          notIn: completedIds
        }
      },
      orderBy: { order: 'asc' }
    });

    if (!nextTask) {
      const keyboard = {
        inline_keyboard: [
          [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
        ]
      };

      await ctx.editMessageText(
        '🎉 Поздравляем! Все задания выполнены!\n\nСледите за обновлениями - скоро появятся новые задания.',
        { reply_markup: keyboard }
      );
      return;
    }

    const taskText = `📋 Задание

📝 ${nextTask.title}

📄 ${nextTask.description}

💰 Награда: ${nextTask.reward} ⭐

Выполните задание и нажмите "Проверить"`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🔗 Перейти', url: nextTask.link }],
        [{ text: '✅ Проверить', callback_data: `check_task_${nextTask.id}` }],
        [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
      ]
    };

    // Task checking is handled in bot.ts via action handlers

    await ctx.editMessageText(taskText, { reply_markup: keyboard });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in handleTasks:', error);
    await ctx.answerCbQuery('❌ Ошибка загрузки заданий');
  }
}

async function checkTask(ctx: any, taskId: string) {
  if (!ctx.from) return;

  const user = await prisma.user.findUnique({
    where: { telegramId: ctx.from.id.toString() },
    include: {
      pets: {
        include: { pet: true }
      }
    }
  });

  if (!user) {
    await ctx.answerCbQuery('❌ Пользователь не найден');
    return;
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      await ctx.answerCbQuery('❌ Задание не найдено');
      return;
    }

    // Check if task already completed
    const existingCompletion = await prisma.userTask.findUnique({
      where: {
        userId_taskId: {
          userId: user.id,
          taskId: task.id
        }
      }
    });

    if (existingCompletion) {
      await ctx.answerCbQuery('✅ Задание уже выполнено');
      return;
    }

    // For channels/chats, verify subscription
    if (task.chatId && (task.type === 'channel' || task.type === 'chat')) {
      try {
        const member = await ctx.telegram.getChatMember(task.chatId, ctx.from.id);
        if (!['creator', 'administrator', 'member'].includes(member.status)) {
          await ctx.answerCbQuery('❌ Подпишитесь на канал для выполнения задания');
          return;
        }
      } catch (error) {
        await ctx.answerCbQuery('❌ Не удалось проверить подписку');
        return;
      }
    }

    // Calculate reward with pet boost
    let baseReward = task.reward;
    let taskBoost = 0;

    user.pets.forEach(userPet => {
      if (userPet.pet.boostType === 'task') {
        taskBoost += userPet.pet.boostValue * userPet.level;
      }
    });

    const totalReward = baseReward + taskBoost;

    // Mark task as completed and give reward
    await prisma.$transaction([
      prisma.userTask.create({
        data: {
          userId: user.id,
          taskId: task.id,
          completed: true,
          claimedAt: new Date()
        }
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: totalReward }
        }
      })
    ]);

    const successText = `✅ Задание выполнено!

💰 Получено: ${totalReward.toFixed(2)} ⭐
${taskBoost > 0 ? `├ Базовая награда: ${baseReward} ⭐\n└ Буст питомцев: +${taskBoost.toFixed(2)} ⭐` : ''}

Продолжайте выполнять задания!`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '📋 Следующее задание', callback_data: 'tasks' }],
        [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
      ]
    };

    await ctx.editMessageText(successText, { reply_markup: keyboard });
    await ctx.answerCbQuery('🎉 Задание выполнено!');
  } catch (error) {
    console.error('Error checking task:', error);
    await ctx.answerCbQuery('❌ Ошибка проверки задания');
  }
}

// Register callback handler
export { checkTask };
