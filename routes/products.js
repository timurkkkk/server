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



router.get('/products', async (req, res) => {
    const { start = '0', size = '1000', globalFilter = '%', sorting, filters } = req.query;
    console.log('Received globalFilter:', globalFilter);
    console.log('Received filters:', filters);

    const startInt = parseInt(start, 10);
    const sizeInt = parseInt(size, 10);

    if (isNaN(startInt) || isNaN(sizeInt)) {
        return res.status(400).json({ error: 'Invalid start or size parameter' });
    }

    try {
        let query = 'SELECT * FROM products';
        let queryParams = [];
        let filterConditions = [];


        if (globalFilter && globalFilter.trim() !== '') {
            filterConditions.push(`(product_name ILIKE $1 OR supplier ILIKE $2 OR item_number ILIKE $3)`);
            queryParams.push(`%${globalFilter}%`, `%${globalFilter}%`, `%${globalFilter}%`);
        }


        if (filters) {
            const columnFilters = JSON.parse(filters);
            if (Array.isArray(columnFilters) && columnFilters.length > 0) {
                columnFilters.forEach((filter) => {

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
        const totalRowCountResult = await pool.query('SELECT COUNT(*) FROM products');
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
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/products', async (req, res) => {
    const { product_name, supplier, item_number } = req.body;
    console.log('Incoming request data:', req.body);

    try {

        if ( !product_name || !supplier || !item_number) {
            return res.status(400).json({ error: 'product_id, product_name, supplier, and item_number are required' });
        }


        const result = await pool.query(
            'INSERT INTO products (product_name, supplier, item_number) VALUES ($1, $2, $3) RETURNING *',
            [ product_name, supplier, item_number]
        );

        console.log('Inserted product:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Internal server error while adding product' });
    }
});

router.put('/products/:id', async (req, res) => {
    const productId = req.params.id;
    console.log('Incoming update data:', req.body);
    console.log('Incoming update id:', productId);
    const { product_name, supplier, item_number } = req.body;

    try {

        if (!product_name || !supplier || !item_number) {
            return res.status(400).json({ error: 'product_name, supplier, and item_number are required' });
        }

        const result = await pool.query(
            'UPDATE products SET product_name = $1, supplier = $2, item_number = $3 WHERE product_id = $4 RETURNING *',
            [product_name, supplier, item_number, productId]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Internal server error while updating product' });
    }
});

router.delete('/products/:id', async (req, res) => {
    const productId = req.params.id;

    try {
        const result = await pool.query('DELETE FROM products WHERE product_id = $1 RETURNING *', [productId]);


        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error while deleting product' });
    }
});

module.exports = router;