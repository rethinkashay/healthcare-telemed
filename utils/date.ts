import { format, parseISO } from 'date-fns';

// 1. Format for Display (e.g. "Mon, Dec 25 at 10:00 AM")
// This automatically uses the browser's local timezone
export function formatLocalTime(isoString: string) {
  if (!isoString) return "Invalid Time";
  const date = parseISO(isoString);
  return format(date, "EEE, MMM d 'at' h:mm a");
}

// 2. Format just the time (e.g. "10:00 AM")
export function formatJustTime(isoString: string) {
  if (!isoString) return "--:--";
  const date = parseISO(isoString);
  return format(date, "h:mm a");
}