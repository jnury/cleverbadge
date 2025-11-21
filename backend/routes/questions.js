const express = require('express');
const yaml = require('js-yaml');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all questions
router.get('/', async (req, res) => {
    try {
        const questions = await prisma.question.findMany();
        res.json(questions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Import questions from YAML
router.post('/import', async (req, res) => {
    try {
        const { yamlContent } = req.body;
        if (!yamlContent) {
            return res.status(400).json({ error: 'yamlContent is required' });
        }

        const questions = yaml.load(yamlContent);

        if (!Array.isArray(questions)) {
            return res.status(400).json({ error: 'YAML must be a list of questions' });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const q of questions) {
            try {
                // Basic validation
                if (!q.content || !q.type) {
                    throw new Error(`Question ${q.id || 'unknown'} missing content or type`);
                }

                await prisma.question.upsert({
                    where: { id: q.id || 'new_uuid' }, // Note: If ID is missing in YAML, upsert logic needs care. For now assuming ID is provided or we create new.
                    update: {
                        content: q.content,
                        type: q.type,
                        options: q.options,
                        correct_answers: q.correct_answers,
                        tags: q.tags || []
                    },
                    create: {
                        id: q.id, // If q.id is undefined, Prisma will generate UUID if configured, but our schema says @id @default(uuid()) so we should probably let it generate if missing.
                        content: q.content,
                        type: q.type,
                        options: q.options,
                        correct_answers: q.correct_answers,
                        tags: q.tags || []
                    }
                });
                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push({ id: q.id, error: err.message });
            }
        }

        res.json({ message: 'Import processed', results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
