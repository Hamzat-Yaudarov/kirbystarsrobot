import { Context } from 'telegraf';
import { User } from '@prisma/client';

export interface BotContext extends Context {
  user?: User;
}

export interface CallbackData {
  action: string;
  data?: string;
}

export interface KeyboardButton {
  text: string;
  callback_data: string;
}

export interface WithdrawalOption {
  amount: number;
  cost: number;
  label: string;
}

export const WITHDRAWAL_OPTIONS: WithdrawalOption[] = [
  { amount: 15, cost: 15, label: '15 ⭐ → 15 звезд' },
  { amount: 25, cost: 25, label: '25 ⭐ → 25 звезд' },
  { amount: 50, cost: 50, label: '50 ⭐ → 50 звезд' },
  { amount: 100, cost: 100, label: '100 ⭐ → 100 звезд' },
  { amount: 1300, cost: 1300, label: '1300 ⭐ → Telegram Premium (3 месяца)' }
];
