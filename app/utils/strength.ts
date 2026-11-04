// Расчёты силы: общие формулы для формы тренировки и экрана прогресса.
// Формула Эпли: 1ПМ = вес × (1 + повторы / 30).

export interface EntryLike {
  working_weight: number | null
  reps: number[] | null
}

/** Расчётный 1ПМ по весу и числу повторов в подходе. */
export function estimateOneRM(weight: number | null | undefined, reps: number | null | undefined): number | null {
  if (!weight || weight <= 0 || !reps || reps <= 0) return null
  return Math.round(weight * (1 + reps / 30))
}

/** Лучший подход записи (максимум повторов) и его расчётный 1ПМ. */
export function entryOneRM(entry: EntryLike): number | null {
  const validReps = (entry.reps || []).filter((r): r is number => typeof r === 'number' && r > 0)
  if (!entry.working_weight || !validReps.length) return null
  return estimateOneRM(entry.working_weight, Math.max(...validReps))
}

/** Объём (тоннаж) записи: вес × сумма повторов по подходам. */
export function entryTonnage(entry: EntryLike): number {
  const weight = entry.working_weight || 0
  const reps = (entry.reps || []).filter((r): r is number => typeof r === 'number' && r > 0)
  return weight * reps.reduce((sum, r) => sum + r, 0)
}

/** Начало недели (понедельник) для даты в формате YYYY-MM-DD. */
export function weekStart(dateStr: string): string {
  const date = new Date(`${dateStr.slice(0, 10)}T00:00:00`)
  const day = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - day)
  return date.toISOString().slice(0, 10)
}

/** Понятная подпись недели: 03.11 */
export function weekLabel(weekStartStr: string): string {
  return `${weekStartStr.slice(8, 10)}.${weekStartStr.slice(5, 7)}`
}
