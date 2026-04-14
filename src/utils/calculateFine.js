export function calculateLateFine(due_Date) {
  const returnDate = new Date();
  const dueDate = new Date(due_Date);

  const timeDifference = returnDate.getTime() - dueDate.getTime();

  if (timeDifference <= 0) {
    return {
      daysOverdue: 0,
      totalFine: 0
    };
  }

  const daysOverdue = Math.ceil(
    timeDifference / (1000 * 60 * 60 * 24)
  );

  let totalFine = 0;

  if (daysOverdue <= 15) {
    totalFine = daysOverdue * 5;
  } else {
    const first15 = 15 * 5; // 75
    const remaining = (daysOverdue - 15) * 20;
    totalFine = first15 + remaining;
  }

  return {
    daysOverdue,
    totalFine: Number(totalFine.toFixed(2))
  };
}