const parseTimeToMinutes = (value) => {
  const match = String(value || '').trim().match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s?(AM|PM)$/i);
  if (!match) return null;

  let hours = Number(match[1]) % 12;
  const minutes = Number(match[2]);
  if (match[3].toUpperCase() === 'PM') hours += 12;
  return hours * 60 + minutes;
};

const rangesOverlap = (startA, endA, startB, endB) => startA < endB && startB < endA;

module.exports = {
  parseTimeToMinutes,
  rangesOverlap,
};
