
const express = require('express');
const cors = require('cors');
const dataRoutes = require('./routes/warehouses');
const productsIncomeRoutes = require('./routes/products_income');
const productsOutcomeRoutes = require('./routes/products_outcome');
const incomeNotesRoutes = require('./routes/income_notes');
const outcomeNotesRoutes = require('./routes/outcome_notes');
const employeesRoutes = require('./routes/employees');
const positionsRoutes = require('./routes/positions');
const productsRoutes = require('./routes/products');
const remainingRoutes = require('./routes/remaining-report-handler');
const revenueRoutes = require('./routes/revenue-report-handler');
const costRoutes = require('./routes/cost-report-handler');


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api', dataRoutes);
app.use('/api', productsIncomeRoutes);
app.use('/api', productsOutcomeRoutes);
app.use('/api', incomeNotesRoutes);
app.use('/api', outcomeNotesRoutes);
app.use('/api', employeesRoutes);
app.use('/api', positionsRoutes);
app.use('/api', productsRoutes);
app.use('/api', remainingRoutes);
app.use('/api', revenueRoutes);
app.use('/api', costRoutes);


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

console.log('1');