const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Database1',
    password: 'postgres',
    port: 5432,
});



router.get('/positions', async (req, res) => {
    const { start = '0', size = '10', globalFilter = '%', sorting, filters } = req.query;
    console.log('Received globalFilter:', globalFilter);
    console.log('Received filters:', filters);

    const startInt = parseInt(start, 10);
    const sizeInt = parseInt(size, 10);

    if (isNaN(startInt) || isNaN(sizeInt)) {
        return res.status(400).json({ error: 'Invalid start or size parameter' });
    }

    try {
        let query = 'SELECT * FROM positions';
        let queryParams = [];
        let filterConditions = [];


        if (globalFilter && globalFilter.trim() !== '') {
            filterConditions.push(`(position_name ILIKE $1::text OR salary::text ILIKE $2::text)`);
            queryParams.push(`%${globalFilter}%`, `%${globalFilter}%`);
        }


        if (filters) {
            const columnFilters = JSON.parse(filters);
            if (Array.isArray(columnFilters) && columnFilters.length > 0) {
                columnFilters.forEach((filter, index) => {

                    if (filter.id && filter.value !== undefined) {
                        filterConditions.push(`${filter.id} ILIKE $${queryParams.length + 1}::text`);
                        queryParams.push(`%${filter.value}%`);
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
        const totalRowCountResult = await pool.query('SELECT COUNT(*) FROM positions');
        const totalRowCount = totalRowCountResult.rows[0].count;

        const response = {
            data: result.rows,
            meta: {
                totalRowCount: parseInt(totalRowCount, 10),
            },
        };
        console.log('Query:', query);
        console.log('Params:', queryParams);

        res.json(response);
    } catch (error) {
        console.error('Error fetching positions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/positions', async (req, res) => {
    const { position_name, salary } = req.body;
    console.log('Incoming request data:', req.body);

    try {

        if (!position_name || salary === undefined) {
            return res.status(400).json({ error: 'Both position_name and salary are required' });
        }


        console.log('INSERTING');

        const result = await pool.query(
            'INSERT INTO positions (position_name, salary) VALUES ($1, $2) RETURNING *',
            [position_name, salary]
        );


        console.log('Inserted position:', result.rows[0]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding position:', error);
        res.status(500).json({ error: 'Internal server error while adding position' });
    }
});

router.put('/positions/:id', async (req, res) => {
    const positionId = req.params.id;
    console.log('Incoming update data:', req.body);
    console.log('Incoming update id:', positionId);
    const { position_name, salary } = req.body;

    try {

        if (!position_name || salary === undefined) {
            return res.status(400).json({ error: 'Both position_name and salary are required' });
        }

        const result = await pool.query(
            'UPDATE positions SET position_name = $1, salary = $2 WHERE position_id = $3 RETURNING *',
            [position_name, salary, positionId]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Position not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating position:', error);
        res.status(500).json({ error: 'Internal server error while updating position' });
    }
});


router.delete('/positions/:id', async (req, res) => {
    const positionId = req.params.id;

    try {
        const result = await pool.query('DELETE FROM positions WHERE position_id = $1 RETURNING *', [positionId]);


        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Position not found' });
        }

        res.status(200).json({ message: 'Position deleted successfully' });
    } catch (error) {
        console.error('Error deleting position:', error);
        res.status(500).json({ error: 'Internal server error while deleting position' });
    }
});

module.exports = router;