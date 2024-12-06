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



router.get('/employees', async (req, res) => {
    const { start = '0', size = '1000', globalFilter = '%', sorting, filters } = req.query;
    console.log('Received globalFilter:', globalFilter);
    console.log('Received filters:', filters);

    const startInt = parseInt(start, 10);
    const sizeInt = parseInt(size, 10);

    if (isNaN(startInt) || isNaN(sizeInt)) {
        return res.status(400).json({ error: 'Invalid start or size parameter' });
    }

    try {
        let query = 'SELECT * FROM employees';
        let queryParams = [];
        let filterConditions = [];


        if (globalFilter && globalFilter.trim() !== '') {
            filterConditions.push(`(id::text ILIKE $1 OR employee_name ILIKE $2 OR phone_number ILIKE $3)`);
            queryParams.push(`%${globalFilter}%`, `%${globalFilter}%`, `%${globalFilter}%`);
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
        const totalRowCountResult = await pool.query('SELECT COUNT(*) FROM employees');
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
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/employees', async (req, res) => {
    const { warehouse_id, inn, position_id, employee_name, phone_number } = req.body;
    console.log('Incoming request data:', req.body);

    try {

        if (!inn || !employee_name || !phone_number) {
            return res.status(400).json({ error: 'id, employee_name, and phone_number are required' });
        }


        const result = await pool.query(
            'INSERT INTO employees (warehouse_id, inn, position_id, employee_name, phone_number) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [warehouse_id, inn, position_id, employee_name, phone_number]
        );

        console.log('Inserted employee:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding employee:', error);
        res.status(500).json({ error: 'Internal server error while adding employee' });
    }
});

router.put('/employees/:id', async (req, res) => {
    const employeeId = req.params.id;
    console.log('Incoming update data:', req.body);
    console.log('Incoming update ID:', employeeId);
    const { warehouse_id, inn, position_id, employee_name, phone_number } = req.body;

    try {

        if (!employee_name || !phone_number) {
            return res.status(400).json({ error: 'employee_name and phone_number are required' });
        }


        const result = await pool.query(
            'UPDATE employees SET warehouse_id = $1, inn = $2, position_id = $3, employee_name = $4, phone_number = $5 WHERE id = $6 RETURNING *',
            [warehouse_id, inn, position_id, employee_name, phone_number, employeeId]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Internal server error while updating employee' });
    }
});

router.delete('/employees/:id', async (req, res) => {
    const employeeId = req.params.id;

    try {
        const result = await pool.query('DELETE FROM employees WHERE id = $1 RETURNING *', [employeeId]);


        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.status(200).json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: 'Internal server error while deleting employee' });
    }
});

module.exports = router;