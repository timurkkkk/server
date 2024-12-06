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


router.get('/warehouses', async (req, res) => {
  const { start = '0', size = '10', globalFilter = '%', sorting, filters } = req.query;
  console.log('Received globalFilter:', globalFilter);
  console.log('Received filters:', filters);

  const startInt = parseInt(start, 10);
  const sizeInt = parseInt(size, 10);

  if (isNaN(startInt) || isNaN(sizeInt)) {
    return res.status(400).json({ error: 'Invalid start or size parameter' });
  }

  try {
    let query = 'SELECT * FROM warehouses';
    let queryParams = [];
    let filterConditions = [];


    if (globalFilter && globalFilter.trim() !== '') {
      filterConditions.push(`(warehouse_name ILIKE $1::text OR manager_inn ILIKE $2::text OR address ILIKE $3::text)`);
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
    if (filters === undefined) query += ` ORDER BY warehouse_id`;


    query += ' LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
    queryParams.push(sizeInt, startInt);

    const result = await pool.query(query, queryParams);
    const totalRowCountResult = await pool.query('SELECT COUNT(*) FROM warehouses');
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
    console.error('Error fetching warehouses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/warehouses', async (req, res) => {
  const { warehouse_name, manager_inn, address } = req.body;
  console.log('Incoming request data:', req.body);
  try {
    let managerInnValue = !manager_inn || manager_inn.trim() === '' ? null : manager_inn;

    console.log('INSERTING');
    const result = await pool.query(
        'INSERT INTO warehouses (warehouse_name, manager_inn, address) VALUES ($1, $2, $3) RETURNING *',
        [warehouse_name, managerInnValue, address]
    );



    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding warehouse:', error);
    res.status(500).json({ error: 'Internal server error while adding warehouse' });
  }
});

router.put('/warehouses/:id', async (req, res) => {
  const warehouseId = req.params.id;
  console.log('Incoming update data:', req.body);
  console.log('Incoming update id:', warehouseId);
  const { warehouse_name, manager_inn, address } = req.body;

  try {
    let managerInnValue = !manager_inn || manager_inn.trim() === '' ? null : manager_inn;

    const result = await pool.query(
        'UPDATE warehouses SET warehouse_name = $1, manager_inn = $2, address = $3 WHERE warehouse_id = $4 RETURNING *',
        [warehouse_name, managerInnValue, address, warehouseId]
    );


    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating warehouse:', error);
    res.status(500).json({ error: 'Internal server error while updating warehouse' });
  }
});


router.delete('/warehouses/:id', async (req, res) => {
  const warehouseId = req.params.id;

  try {
    const result = await pool.query('DELETE FROM warehouses WHERE warehouse_id = $1 RETURNING *', [warehouseId]);


    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    res.status(200).json({ message: 'Warehouse deleted successfully' });
  } catch (error) {
    console.error('Error deleting warehouse:', error);
    res.status(500).json({ error: 'Internal server error while deleting warehouse' });
  }
});

module.exports = router;