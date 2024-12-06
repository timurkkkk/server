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

router.get('/income_notes', async (req, res) => {
    const { start = '0', size = '10', globalFilter = '%', sorting, filters } = req.query;
    console.log('Received globalFilter:', globalFilter);
    console.log('Received filters:', filters);

    const startInt = parseInt(start, 10);
    const sizeInt = parseInt(size, 10);

    if (isNaN(startInt) || isNaN(sizeInt)) {
        return res.status(400).json({ error: 'Invalid start or size parameter' });
    }

    try {
        let query = 'SELECT * FROM income_notes';
        let queryParams = [];
        let filterConditions = [];


        if (globalFilter && globalFilter.trim() !== '') {
            filterConditions.push(`(item_number ILIKE $1::text OR price::text ILIKE $2::text OR quantity::text ILIKE $3::text OR total::text ILIKE $4::text)`);
            queryParams.push(`%${globalFilter}%`, `%${globalFilter}%`, `%${globalFilter}%`, `%${globalFilter}%`);
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
        const totalRowCountResult = await pool.query('SELECT COUNT(*) FROM income_notes');
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
        console.error('Error fetching income notes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/income_notes', async (req, res) => {
    const incomeNotes = req.body;
    console.log('Incoming request data:', incomeNotes);

    if (!Array.isArray(incomeNotes) || incomeNotes.length === 0) {
        return res.status(400).json({ error: 'Request body must be a non-empty array of income notes' });
    }

    try {

        for (const note of incomeNotes) {
            const { product_id, item_number, price, quantity, total, income_note_id } = note;
            if (!product_id || !item_number || price === undefined || quantity === undefined || total === undefined || income_note_id === undefined) {
                return res.status(400).json({ error: 'All fields (product_id, item_number, price, quantity, total, income_note_id) are required for each note' });
            }
        }


        const values = incomeNotes.map((_, index) => {
            return `($${index * 6 + 1}, $${index * 6 + 2}, $${index * 6 + 3}, $${index * 6 + 4}, $${index * 6 + 5}, $${index * 6 + 6})`;
        }).join(', ');

        const queryParams = incomeNotes.flatMap(note => [
            note.product_id,
            note.item_number,
            note.price,
            note.quantity,
            note.total,
            note.income_note_id
        ]);

        console.log('INSERTING');

        const result = await pool.query(
            `INSERT INTO income_notes (product_id, item_number, price, quantity, total, income_note_id) VALUES ${values} RETURNING *`,
            queryParams
        );


        console.log('Inserted income notes:', result.rows);

        res.status(201).json(result.rows);
    } catch (error) {
        console.error('Error adding income notes:', error);
        res.status(500).json({ error: 'Internal server error while adding income notes' });
    }
});

router.put('/income_notes/:id', async (req, res) => {
    const incomeNoteId = req.params.id;
    console.log('Incoming update data:', req.body);
    console.log('Incoming update id:', incomeNoteId);

    const { product_id, item_number, price, quantity, total, income_note_id } = req.body;

    try {

        if (!product_id || !item_number || price === undefined || quantity === undefined || total === undefined || income_note_id === undefined) {
            return res.status(400).json({ error: 'All fields (product_id, item_number, price, quantity, total, income_note_id) are required' });
        }

        const result = await pool.query(
            'UPDATE income_notes SET product_id = $1, item_number = $2, price = $3, quantity = $4, total = $5, income_note_id = $6 WHERE id = $7 RETURNING *',
            [product_id, item_number, price, quantity, total, income_note_id, incomeNoteId]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Income note not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating income note:', error);
        res.status(500).json({ error: 'Internal server error while updating income note' });
    }
});

router.delete('/income_notes/:id', async (req, res) => {
    const incomeNoteId = req.params.id;

    try {
        const result = await pool.query('DELETE FROM income_notes WHERE id = $1 RETURNING *', [incomeNoteId]);


        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Income note not found' });
        }

        res.status(200).json({ message: 'Income note deleted successfully' });
    } catch (error) {
        console.error('Error deleting income note:', error);
        res.status(500).json({ error: 'Internal server error while deleting income note' });
    }
});

module.exports = router;