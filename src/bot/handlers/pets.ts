import { PrismaClient } from '@prisma/client';
import { BotContext } from '../types';

const prisma = new PrismaClient();

export async function handlePets(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.answerCbQuery('❌ Пользователь не найден');
    return;
  }

  const action = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : 'pets';

  if (action === 'pets' || action === 'pets_list') {
    await showPetsList(ctx);
  } else if (action === 'my_pets') {
    await showMyPets(ctx);
  } else if (action.startsWith('buy_pet_')) {
    const petId = action.replace('buy_pet_', '');
    await buyPet(ctx, petId);
  } else if (action.startsWith('pet_info_')) {
    const petId = action.replace('pet_info_', '');
    await showPetInfo(ctx, petId);
  } else if (action.startsWith('upgrade_pet_')) {
    const userPetId = action.replace('upgrade_pet_', '');
    await upgradePet(ctx, userPetId);
  }
}

async function showPetsList(ctx: BotContext) {
  try {
    const pets = await prisma.pet.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });

    if (pets.length === 0) {
      const noPetsText = `🐾 Питомцы

❌ Питомцы пока недоступны

Следите за обновлениями!`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
        ]
      };

      await ctx.editMessageText(noPetsText, { reply_markup: keyboard });
      return;
    }

    const petsText = `🐾 Магазин питомцев

💡 Питомцы дают постоянные бусты к доходу!

Доступные питомцы:`;

    const keyboard = {
      inline_keyboard: [
        ...pets.map(pet => ([{
          text: `${pet.name} - ${pet.price} ⭐`,
          callback_data: `pet_info_${pet.id}`
        }])),
        [{ text: '🐾 Мои питомцы', callback_data: 'my_pets' }],
        [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
      ]
    };

    await ctx.editMessageText(petsText, { reply_markup: keyboard });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in showPetsList:', error);
    await ctx.answerCbQuery('❌ Ошибка загрузки питомцев');
  }
}

async function showPetInfo(ctx: BotContext, petId: string) {
  try {
    const pet = await prisma.pet.findUnique({
      where: { id: petId }
    });

    if (!pet) {
      await ctx.answerCbQuery('❌ Питомец не найден');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: ctx.user!.id }
    });

    const boostTypeText = {
      'click': 'Увеличение дохода от кликов',
      'referral1': 'Увеличение дохода от рефералов 1 уровня',
      'referral2': 'Увеличение дохода от рефералов 2 уровня',
      'task': 'Увеличение дохода от заданий'
    };

    const petText = `🐾 ${pet.name}

📄 ${pet.description}

💰 Цена: ${pet.price} ⭐
🚀 Буст: ${boostTypeText[pet.boostType as keyof typeof boostTypeText]}
📈 Значение: +${pet.boostValue} ⭐

💫 Ваш баланс: ${user?.balance.toFixed(2)} ⭐`;

    const canBuy = user && user.balance >= pet.price;
    const hasAlready = await prisma.userPet.findUnique({
      where: {
        userId_petId: {
          userId: ctx.user!.id,
          petId: pet.id
        }
      }
    });

    const keyboard = {
      inline_keyboard: [
        ...(canBuy && !hasAlready ? [[{ text: '💰 Купить', callback_data: `buy_pet_${pet.id}` }]] : []),
        ...(hasAlready ? [[{ text: '✅ Уже куплен', callback_data: 'my_pets' }]] : []),
        [{ text: '⬅️ Назад', callback_data: 'pets_list' }],
        [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
      ]
    };

    await ctx.editMessageText(petText, { reply_markup: keyboard });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in showPetInfo:', error);
    await ctx.answerCbQuery('❌ Ошибка загрузки информации о питомце');
  }
}

async function buyPet(ctx: BotContext, petId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: ctx.user!.id }
    });

    const pet = await prisma.pet.findUnique({
      where: { id: petId }
    });

    if (!user || !pet) {
      await ctx.answerCbQuery('❌ Ошибка данных');
      return;
    }

    if (user.balance < pet.price) {
      await ctx.answerCbQuery('❌ Недостаточно звёзд');
      return;
    }

    const hasAlready = await prisma.userPet.findUnique({
      where: {
        userId_petId: {
          userId: user.id,
          petId: pet.id
        }
      }
    });

    if (hasAlready) {
      await ctx.answerCbQuery('❌ Питомец уже куплен');
      return;
    }

    // Buy pet
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          balance: { decrement: pet.price }
        }
      }),
      prisma.userPet.create({
        data: {
          userId: user.id,
          petId: pet.id,
          level: 1
        }
      })
    ]);

    const successText = `🎉 Питомец куплен!

🐾 ${pet.name}
💰 Потрачено: ${pet.price} ⭐
💫 Остаток: ${(user.balance - pet.price).toFixed(2)} ⭐

Питомец уже даёт буст к вашему доходу!`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🐾 Мои питомцы', callback_data: 'my_pets' }],
        [{ text: '🏪 Магазин', callback_data: 'pets_list' }],
        [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
      ]
    };

    await ctx.editMessageText(successText, { reply_markup: keyboard });
    await ctx.answerCbQuery('🎉 Питомец куплен!');
  } catch (error) {
    console.error('Error in buyPet:', error);
    await ctx.answerCbQuery('❌ Ошибка покупки питомца');
  }
}

async function showMyPets(ctx: BotContext) {
  try {
    const userPets = await prisma.userPet.findMany({
      where: { userId: ctx.user!.id },
      include: { pet: true },
      orderBy: { createdAt: 'asc' }
    });

    if (userPets.length === 0) {
      const noPetsText = `🐾 Мои питомцы

❌ У вас пока нет питомцев

Купите своего первого питомца в магазине!`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🏪 Магазин питомцев', callback_data: 'pets_list' }],
          [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
        ]
      };

      await ctx.editMessageText(noPetsText, { reply_markup: keyboard });
      return;
    }

    let totalBoosts = {
      click: 0,
      referral1: 0,
      referral2: 0,
      task: 0
    };

    userPets.forEach(userPet => {
      const boost = userPet.pet.boostValue * userPet.level;
      totalBoosts[userPet.pet.boostType as keyof typeof totalBoosts] += boost;
    });

    const myPetsText = `🐾 Мои питомцы (${userPets.length})

📊 Общие бусты:
├ Клики: +${totalBoosts.click.toFixed(3)} ⭐
├ Рефералы 1 ур.: +${totalBoosts.referral1.toFixed(2)} ⭐
├ Рефера��ы 2 ур.: +${totalBoosts.referral2.toFixed(3)} ⭐
└ Задания: +${totalBoosts.task.toFixed(2)} ⭐

Ваши питомцы:`;

    const keyboard = {
      inline_keyboard: [
        ...userPets.map(userPet => ([{
          text: `${userPet.pet.name} (ур.${userPet.level})`,
          callback_data: `upgrade_pet_${userPet.id}`
        }])),
        [{ text: '🏪 Магазин', callback_data: 'pets_list' }],
        [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
      ]
    };

    await ctx.editMessageText(myPetsText, { reply_markup: keyboard });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in showMyPets:', error);
    await ctx.answerCbQuery('❌ Ошибка загрузки питомцев');
  }
}

async function upgradePet(ctx: BotContext, userPetId: string) {
  try {
    const userPet = await prisma.userPet.findUnique({
      where: { id: userPetId },
      include: { pet: true }
    });

    if (!userPet || userPet.userId !== ctx.user!.id) {
      await ctx.answerCbQuery('❌ Питомец не найден');
      return;
    }

    const upgradeCost = userPet.pet.price * userPet.level; // Cost increases with level
    const currentBoost = userPet.pet.boostValue * userPet.level;
    const nextBoost = userPet.pet.boostValue * (userPet.level + 1);

    const user = await prisma.user.findUnique({
      where: { id: ctx.user!.id }
    });

    const upgradeText = `🐾 ${userPet.pet.name}

📊 Текущий уровень: ${userPet.level}
🚀 Текущий буст: +${currentBoost.toFixed(3)} ⭐
⬆️ Буст после улучшения: +${nextBoost.toFixed(3)} ⭐

💰 Стоимость улучшения: ${upgradeCost} ⭐
💫 Ваш баланс: ${user?.balance.toFixed(2)} ⭐

${user && user.balance >= upgradeCost ? '✅ Можно улучшить!' : '❌ Недостаточно звёзд'}`;

    const canUpgrade = user && user.balance >= upgradeCost;

    const keyboard = {
      inline_keyboard: [
        ...(canUpgrade ? [[{ text: '⬆️ Улучшить', callback_data: `confirm_upgrade_${userPetId}` }]] : []),
        [{ text: '⬅️ Мои питомцы', callback_data: 'my_pets' }],
        [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
      ]
    };

    await ctx.editMessageText(upgradeText, { reply_markup: keyboard });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in upgradePet:', error);
    await ctx.answerCbQuery('❌ Ошибка загрузки информации о питомце');
  }
}

// Export all handlers
export { showPetsList, showPetInfo, buyPet, showMyPets, upgradePet };
