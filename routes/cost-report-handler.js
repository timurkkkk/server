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

router.post('/cost-report', async (req, res) => {
  const { warehouseId, startDate, endDate, sortBy } = req.body;

  try {
    let query = `
      SELECT warehouse_id, item_number, product_name, SUM(total) as total
      FROM costs
      WHERE date >= $1 AND date <= $2
    `;

    const queryParams = [startDate, endDate];

    if (warehouseId) {
      query += ' AND warehouse_id = $3';
      queryParams.push(warehouseId);
    }

    query += ' GROUP BY warehouse_id, item_number, product_name';

    switch (sortBy) {
      case 'warehouse_id':
        query += ' ORDER BY warehouse_id, item_number';
        break;
      case 'item_number':
        query += ' ORDER BY warehouse_id, item_number';
        break;
      case 'product_name':
        query += ' ORDER BY warehouse_id, product_name';
        break;
      default:
        query += ' ORDER BY warehouse_id, item_number';
    }

    const result = await pool.query(query, queryParams);

    res.json(result.rows);
  } catch (error) {
    console.error('Error generating cost report:', error);
    res.status(500).json({ error: 'Internal server error while generating cost report' });
  }
});

module.exports = router;