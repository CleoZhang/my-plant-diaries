import { format, parse } from 'date-fns';

// Format date to "25 Jun 2025" style
export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return '';
  try {
    // Parse ISO date string in local timezone to avoid timezone conversion issues
    // "2025-11-15" should stay as November 15, not shift to November 14
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, 'dd MMM yyyy');
  } catch {
    return '';
  }
};

// Parse date from "25 Jun 2025" style
export const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  try {
    return parse(dateString, 'dd MMM yyyy', new Date());
  } catch {
    return null;
  }
};

// Format date to ISO string for storage
export const toISODate = (date: Date | null): string => {
  if (!date) return '';
  // Use local date components to avoid timezone conversion issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
