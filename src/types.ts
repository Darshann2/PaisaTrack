export * from './types/finance';

export interface DaySummary {
  name: string; // 'Mon', 'Tue', ...
  fullName: string; // 'Monday', ...
  dateStr: string; // 'YYYY-MM-DD'
  displayDate: string; // '26 Oct'
  income: number;
  expense: number;
  isToday: boolean;
}

export interface WeekRange {
  monday: Date;
  sunday: Date;
  startStr: string;
  endStr: string;
}
