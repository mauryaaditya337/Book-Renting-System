const MS_PER_DAY = 1000 * 60 * 60 * 24;

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function calculateRentalDays(startDate, endDate) {
  const normalizedStart = new Date(startDate);
  const normalizedEnd = new Date(endDate);

  if (Number.isNaN(normalizedStart.getTime()) || Number.isNaN(normalizedEnd.getTime())) {
    return 0;
  }

  const differenceInMs = normalizedEnd.getTime() - normalizedStart.getTime();

  if (differenceInMs <= 0) {
    return 0;
  }

  return Math.round(differenceInMs / MS_PER_DAY);
}

function calculateRentalPricing({ weeklyRent, startDate, endDate }) {
  const normalizedWeeklyRent = roundCurrency(weeklyRent);
  const rentalDays = calculateRentalDays(startDate, endDate);
  const perDayRent = roundCurrency(normalizedWeeklyRent / 7);
  const totalRent = roundCurrency(perDayRent * rentalDays);

  return {
    weeklyRent,
    perDayRent,
    rentalDays,
    totalRent
  };
}

module.exports = {
  roundCurrency,
  calculateRentalDays,
  calculateRentalPricing
};
