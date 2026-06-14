const getDateRange = (range, startDate, endDate) => {
  const now = new Date();

  let start;
  let end;

  switch (range) {
    case "today":
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
      break;

    case "this_week":
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());

      end = new Date();
      break;

    case "this_month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date();
      break;

    case "last_month":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      break;

    case "this_year":
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date();
      break;

    case "custom":
      start = new Date(startDate);
      end = new Date(endDate);
      break;

    default:
      throw new Error("Invalid range");
  }

  return { start, end };
};