
export type WageType = 'hourly' | 'yearly';

export interface User {
  id: string;
  email: string;
  name: string;
  defaultWage: number;
  wageType: WageType;
  currency: string;
  createdAt: number;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  createdAt: number;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  startingAmount: number;
  weeklySavings: number;
  createdAt: number;
  updatedAt: number;
}

export interface Decision {
  id: string;
  userId: string;
  name: string;
  cost: number;
  hourlyWageUsed: number;
  categoryId: string;
  computedHours: number;
  computedGoalDelayDays: number;
  createdAt: number;
}

export enum WishlistStatus {
  WISHLISTED = 'wishlisted',
  PURCHASED = 'purchased',
  ARCHIVED = 'archived'
}

export interface WishlistItem {
  id: string;
  userId: string;
  name: string;
  cost: number;
  categoryId: string;
  note?: string;
  status: WishlistStatus;
  imageUrl?: string;
  createdAt: number;
  purchasedAt?: number;
}

export const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CHF', symbol: 'Fr' },
  { code: 'CNY', symbol: '¥' },
  { code: 'INR', symbol: '₹' },
  { code: 'BRL', symbol: 'R$' },
  { code: 'MXN', symbol: '$' },
  { code: 'ZAR', symbol: 'R' }
];
