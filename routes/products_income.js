const express = require('express');
const { Pool } = require('pg');
const { parse, formatISO } = require('date-fns');
const router = express.Router();

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Database1',
    password: 'postgres',
    port: 5432,
});

function convertDateFormat(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;
    const [day, month, year] = dateString.split('.');
    if (!day || !month || !year) return null;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

router.get('/products_income', async (req, res) => {
    const { start = '0', size = '10', globalFilter = '%', sorting, filters } = req.query;
    console.log('Received globalFilter:', globalFilter);
    console.log('Received filters:', filters);

    const startInt = parseInt(start, 10);
    const sizeInt = parseInt(size, 10);

    if (isNaN(startInt) || isNaN(sizeInt)) {
        return res.status(400).json({ error: 'Invalid start or size parameter' });
    }

    try {
        let query = 'SELECT * FROM products_income';
        let queryParams = [];
        let filterConditions = [];

        if (globalFilter && globalFilter.trim() !== '%' && globalFilter.trim() !== '') {
            filterConditions.push(`(contractor ILIKE $1 OR total::text ILIKE $2)`);
            queryParams.push(`%${globalFilter}%`, `%${globalFilter}%`);
        }

        if (filters) {
            const columnFilters = JSON.parse(filters);
            if (Array.isArray(columnFilters) && columnFilters.length > 0) {
                columnFilters.forEach((filter) => {
                    if (filter.id && filter.value !== undefined) {
                        if (filter.id === 'warehouse_id' || filter.id === 'income_note_id') {
                            filterConditions.push(`${filter.id} = $${queryParams.length + 1}::integer`);
                            queryParams.push(parseInt(filter.value, 10));
                        } else if (filter.id === 'total') {
                            filterConditions.push(`total::text ILIKE $${queryParams.length + 1}::text`);
                            queryParams.push(`%${filter.value}%`);
                        } else if (filter.id === 'date') {
                            filterConditions.push(`date::text ILIKE $${queryParams.length + 1}::text`);
                            queryParams.push(`%${filter.value}%`);
                        } else {
                            filterConditions.push(`${filter.id} ILIKE $${queryParams.length + 1}::text`);
                            queryParams.push(`%${filter.value}%`);
                        }
                    }
                });
            }
        }

        if (filterConditions.length > 0) {
            query += ' WHERE ' + filterConditions.join(' AND ');
        }

        if (sorting) {
            const sortParams = JSON.parse(sorting);
            if (Array.isArray(sortParams) && sortParams.length > 0) {
                const orderBy = sortParams.map(s => `${s.id} ${s.desc ? 'DESC' : 'ASC'}`).join(', ');
                query += ` ORDER BY ${orderBy}`;
            }
        }

        query += ' LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
        queryParams.push(sizeInt, startInt);

        const result = await pool.query(query, queryParams);
        const totalRowCountResult = await pool.query('SELECT COUNT(*) FROM products_income');
        const totalRowCount = totalRowCountResult.rows[0].count;

        const response = {
            data: result.rows.map(row => ({
                ...row,
                date: row.date ? formatISO(new Date(row.date), { representation: 'date' }) : null
            })),
            meta: {
                totalRowCount: parseInt(totalRowCount, 10),
            },
        };

        console.log('Query:', query);
        console.log('Params:', queryParams);

        res.json(response);
    } catch (error) {
        console.error('Error fetching products_income:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

router.post('/products_income', async (req, res) => {
    const { warehouse_id, contractor, total, income_note_id, date } = req.body;
    console.log('Incoming request data:', req.body);

    try {
        const formattedDate = date ? date : null;
        const result = await pool.query(
            'INSERT INTO products_income (warehouse_id, contractor, total, income_note_id, date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [warehouse_id, contractor, total, income_note_id, formattedDate]
        );

        console.log('Inserted products_income:', result.rows[0]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding products_income:', error);
        res.status(500).json({ error: 'Internal server error while adding products_income' });
    }
});

router.put('/products_income/:id', async (req, res) => {
    const id = req.params.id;
    console.log('Incoming update data:', req.body);
    console.log('Incoming update id:', id);

    const { warehouse_id, contractor, total, income_note_id, date } = req.body;
    console.log('Received date:', date);

    try {
        if (warehouse_id === undefined || total === undefined || income_note_id === undefined || date === undefined) {
            return res.status(400).json({ error: 'warehouse_id, total, income_note_id, and date are required' });
        }

        const formattedDate = date ? date : null;
        console.log('FormattedDate:', formattedDate);
        const result = await pool.query(
            'UPDATE products_income SET warehouse_id = $1, contractor = $2, total = $3, income_note_id = $4, date = $5 WHERE id = $6 RETURNING *',
            [warehouse_id, contractor, total, income_note_id, formattedDate, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'products_income not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating products_income:', error);
        res.status(500).json({ error: 'Internal server error while updating products_income' });
    }
});

router.delete('/products_income/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    console.log('Incoming delete id:', id);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
    }

    try {
        const result = await pool.query('DELETE FROM products_income WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'products_income not found' });
        }

        res.status(200).json({ message: 'products_income deleted successfully' });
    } catch (error) {
        console.error('Error deleting products_income:', error);
        res.status(500).json({ error: 'Internal server error while deleting products_income' });
    }
});

module.exports = router;