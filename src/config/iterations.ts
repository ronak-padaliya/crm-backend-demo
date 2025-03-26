export const getIterations = async (db) => {
    const result = await db.query('SELECT iteration, days FROM followup_iterations ORDER BY days ASC');
    return result.rows.reduce((acc, row) => {
        acc[row.iteration] = row.days;
        return acc;
    }, {});
};