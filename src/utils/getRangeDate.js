const formatDate = (date) => date.toISOString().slice(0, 10);

const getDateRange = (range, startDate, endDate) => {
    const now = new Date();

    let start;
    let end;

    switch (range) {
        case "today":
            start = new Date(now);
            end = new Date(now);
            break;

        case "this_week":
            start = new Date(now);
            start.setDate(start.getDate() - start.getDay());
            end = new Date(now);
            break;

        case "this_month":
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now);
            break;

        case "last_month":
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
            break;

        case "this_year":
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now);
            break;

        case "custom":
            start = new Date(startDate);
            end = new Date(endDate);
            break;

        default:
            throw new Error("Invalid range");
    }

    return {
        start: formatDate(start),
        end: formatDate(end)
    };
};

export default getDateRange;