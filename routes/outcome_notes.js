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



router.get('/outcome_notes', async (req, res) => {
    const { start = '0', size = '10', globalFilter = '%', sorting, filters } = req.query;
    console.log('Received globalFilter:', globalFilter);
    console.log('Received filters:', filters);

    const startInt = parseInt(start, 10);
    const sizeInt = parseInt(size, 10);

    if (isNaN(startInt) || isNaN(sizeInt)) {
        return res.status(400).json({ error: 'Invalid start or size parameter' });
    }

    try {
        let query = 'SELECT * FROM outcome_notes';
        let queryParams = [];
        let filterConditions = [];


        if (globalFilter && globalFilter.trim() !== '') {
            filterConditions.push(`(item_number ILIKE $1::text OR price::text ILIKE $2::text OR quantity::text ILIKE $3::text OR total::text ILIKE $4::text OR outcome_note_id::text ILIKE $5::text)`);
            queryParams.push(`%${globalFilter}%`, `%${globalFilter}%`, `%${globalFilter}%`, `%${globalFilter}%`, `%${globalFilter}%`);
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
        const totalRowCountResult = await pool.query('SELECT COUNT(*) FROM outcome_notes');
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
        console.error('Error fetching outcome notes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/outcome_notes', async (req, res) => {
    const outcomeNotes = req.body;
    console.log('Incoming request data:', outcomeNotes);


    if (!Array.isArray(outcomeNotes) || outcomeNotes.length === 0) {
        return res.status(400).json({ error: 'Request body must be a non-empty array of outcome notes' });
    }

    try {

        for (const note of outcomeNotes) {
            const { item_number, price, quantity, total, outcome_note_id } = note;
            if (!item_number || price === undefined || quantity === undefined || total === undefined || outcome_note_id === undefined) {
                return res.status(400).json({ error: 'All fields (item_number, price, quantity, total, outcome_note_id) are required for each note' });
            }
        }


        const values = outcomeNotes.map((_, index) => {
            return `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5})`;
        }).join(', ');


        const queryParams = outcomeNotes.flatMap(note => [
            note.item_number,
            note.price,
            note.quantity,
            note.total,
            note.outcome_note_id
        ]);

        console.log('INSERTING');

        const result = await pool.query(
            `INSERT INTO outcome_notes (item_number, price, quantity, total, outcome_note_id) VALUES ${values} RETURNING *`,
            queryParams
        );


        console.log('Inserted outcome notes:', result.rows);

        res.status(201).json(result.rows);
    } catch (error) {
        console.error('Error adding outcome notes:', error);
        res.status(500).json({ error: 'Internal server error while adding outcome notes' });
    }
});

router.put('/outcome_notes/:id', async (req, res) => {
    const outcomeNoteId = req.params.id;
    console.log('Incoming update data:', req.body);
    console.log('Incoming update id:', outcomeNoteId);

    const { item_number, price, quantity, total, outcome_note_id } = req.body;

    try {

        if (!item_number || price === undefined || quantity === undefined || total === undefined || outcome_note_id === undefined) {
            return res.status(400).json({ error: 'All fields (item_number, price, quantity, total, outcome_note_id) are required' });
        }

        const result = await pool.query(
            'UPDATE outcome_notes SET item_number = $1, price = $2, quantity = $3, total = $4, outcome_note_id = $5 WHERE id = $6 RETURNING *',
            [item_number, price, quantity, total, outcome_note_id, outcomeNoteId]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Outcome note not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating outcome note:', error);
        res.status(500).json({ error: 'Internal server error while updating outcome note' });
    }
});

router.delete('/outcome_notes/:id', async (req, res) => {
    const outcomeNoteId = req.params.id;

    try {
        const result = await pool.query('DELETE FROM outcome_notes WHERE id = $1 RETURNING *', [outcomeNoteId]);


        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Outcome note not found' });
        }

        res.status(200).json({ message: 'Outcome note deleted successfully' });
    } catch (error) {
        console.error('Error deleting outcome note:', error);
        res.status(500).json({ error: 'Internal server error while deleting outcome note' });
    }
});

module.exports = router;