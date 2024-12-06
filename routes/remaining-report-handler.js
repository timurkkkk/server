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

router.post('/inventory-report', async (req, res) => {
  const { warehouseId, groupBy, sortBy } = req.body;
  console.log('whid',warehouseId);
  console.log('g',groupBy);
  console.log('s',sortBy);

  try {
    let query = `
      SELECT warehouse_id, item_number, product_name, SUM(remaining) AS total_remaining
      FROM remaining_stock
    `;
    if (warehouseId) query += ' WHERE warehouse_id = $1';

    if (groupBy === 'item_number' && sortBy === 'product_name')
      query += ' GROUP BY item_number, product_name, warehouse_id ORDER BY product_name, item_number';
    else {

      if (groupBy === 'warehouse_id') {
        query += ' GROUP BY warehouse_id, product_name, item_number ORDER BY warehouse_id';
      } else if (groupBy === 'item_number') {
        query += ' GROUP BY item_number, product_name, warehouse_id ORDER BY item_number';
      }

      query += `, ${sortBy}`;
      if (sortBy === 'total_remaining') query += ' DESC';
    }

    const result = await pool.query(query, warehouseId ? [warehouseId]: null);

    res.json(result.rows);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Internal server error while generating report' });
  }
});

module.exports = router;