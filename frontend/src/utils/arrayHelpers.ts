// Array manipulation utilities

export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
    return array.reduce((acc, item) => {
        const groupKey = String(item[key]);
        if (!acc[groupKey]) {
            acc[groupKey] = [];
        }
        acc[groupKey].push(item);
        return acc;
    }, {} as Record<string, T[]>);
};

export const sortByDate = <T extends { endTime: string }>(array: T[], descending = true): T[] => {
    return [...array].sort((a, b) => {
        const timeA = new Date(a.endTime).getTime();
        const timeB = new Date(b.endTime).getTime();
        return descending ? timeB - timeA : timeA - timeB;
    });
};
