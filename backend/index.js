const express = require('express');
const cors = require('cors');
const config = require('./lib/config');
const prisma = require('./lib/prisma');

const app = express();
const PORT = config.port;

const questionsRouter = require('./routes/questions');
const testsRouter = require('./routes/tests');
const assessmentsRouter = require('./routes/assessments');

app.use(cors());
app.use(express.json());

app.use('/api/questions', questionsRouter);
app.use('/api/tests', testsRouter);
app.use('/api/assessments', assessmentsRouter);

app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
