import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function setupCronJobs() {
  // Reset weekly referrals every Monday at 00:00
  cron.schedule('0 0 * * 1', async () => {
    try {
      console.log('🔄 Resetting weekly referrals...');
      
      // Award weekly top referrers first
      await awardWeeklyPrizes();
      
      // Reset weekly referrals
      await prisma.user.updateMany({
        data: {
          weeklyReferrals: 0,
          weekResetDate: new Date()
        }
      });
      
      console.log('✅ Weekly referrals reset completed');
    } catch (error) {
      console.error('❌ Error resetting weekly referrals:', error);
    }
  });

  // Check and end lotteries every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const expiredLotteries = await prisma.lottery.findMany({
        where: {
          isActive: true,
          endDate: {
            lte: new Date()
          },
          winnerSelected: false
        }
      });

      for (const lottery of expiredLotteries) {
        await selectLotteryWinner(lottery.id);
      }
    } catch (error) {
      console.error('❌ Error checking lotteries:', error);
    }
  });

  console.log('⏰ Cron jobs scheduled');
}

async function awardWeeklyPrizes() {
  try {
    const topUsers = await prisma.user.findMany({
      where: {
        weeklyReferrals: {
          gt: 0
        }
      },
      orderBy: {
        weeklyReferrals: 'desc'
      },
      take: 5
    });

    const prizes = [100, 75, 50, 25, 15];

    for (let i = 0; i < topUsers.length && i < prizes.length; i++) {
      await prisma.user.update({
        where: { id: topUsers[i].id },
        data: {
          balance: {
            increment: prizes[i]
          }
        }
      });
    }

    console.log(`✅ Weekly prizes awarded to ${topUsers.length} users`);
  } catch (error) {
    console.error('❌ Error awarding weekly prizes:', error);
  }
}

async function selectLotteryWinner(lotteryId: string) {
  try {
    const lottery = await prisma.lottery.findUnique({
      where: { id: lotteryId },
      include: {
        tickets: {
          include: {
            user: true
          }
        }
      }
    });

    if (!lottery || lottery.tickets.length === 0) return;

    // Select random winner
    const randomIndex = Math.floor(Math.random() * lottery.tickets.length);
    const winner = lottery.tickets[randomIndex];

    // Calculate prize (total pool minus commission)
    const totalPrize = lottery.prizePool * (1 - lottery.commission / 100);

    // Update lottery
    await prisma.lottery.update({
      where: { id: lotteryId },
      data: {
        winnerId: winner.userId,
        winnerSelected: true,
        isActive: false
      }
    });

    // Award prize to winner
    await prisma.user.update({
      where: { id: winner.userId },
      data: {
        balance: {
          increment: totalPrize
        }
      }
    });

    console.log(`🎉 Lottery ${lotteryId} winner selected: ${winner.user.username || winner.user.firstName}`);
  } catch (error) {
    console.error('❌ Error selecting lottery winner:', error);
  }
}
