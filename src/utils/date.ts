/** Returns today's date in Asia/Taipei (CST, UTC+8) as YYYY-MM-DD */
export const todayCST = (): string =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })

/** Returns current YYYY-MM in CST */
export const thisMonthCST = (): string => todayCST().substring(0, 7)

/** Returns current year in CST */
export const thisYearCST = (): number => parseInt(todayCST().substring(0, 4), 10)

/** Add days to a YYYY-MM-DD string, returns YYYY-MM-DD */
export const addDaysCST = (dateStr: string, days: number): string => {
  // Parse as local noon to avoid UTC midnight shifts
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  return dt.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

/** Extract YYYY-MM from a YYYY-MM-DD string */
export const toMonth = (dateStr: string): string => dateStr.substring(0, 7)
