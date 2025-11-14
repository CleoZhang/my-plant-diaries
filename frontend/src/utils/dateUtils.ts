import { format, parse } from 'date-fns';

// Format date to "25, Jun 2025" style
export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return format(date, 'dd, MMM yyyy');
  } catch {
    return '';
  }
};

// Parse date from "25, Jun 2025" style
export const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  try {
    return parse(dateString, 'dd, MMM yyyy', new Date());
  } catch {
    return null;
  }
};

// Format date to ISO string for storage
export const toISODate = (date: Date | null): string => {
  if (!date) return '';
  return date.toISOString().split('T')[0];
};

// Get days since last watered
export const getDaysSinceWatered = (lastWatered: string | undefined | null): number | null => {
  if (!lastWatered) return null;
  try {
    const waterDate = new Date(lastWatered);
    const today = new Date();
    const diff = Math.floor((today.getTime() - waterDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  } catch {
    return null;
  }
};

// Format price with GBP
export const formatPrice = (price: number | undefined | null): string => {
  if (!price) return '';
  return `£${price.toFixed(2)}`;
};
