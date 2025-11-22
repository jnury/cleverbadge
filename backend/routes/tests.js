const express = require('express');
const prisma = require('../lib/prisma');
const router = express.Router();

// Get all tests
router.get('/', async (req, res) => {
    try {
        const tests = await prisma.test.findMany({
            include: {
                _count: {
                    select: { questions: true }
                }
            }
        });
        res.json(tests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get public test info by slug
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const test = await prisma.test.findUnique({
            where: { slug },
            include: {
                questions: {
                    include: {
                        question: {
                            select: {
                                id: true,
                                content: true,
                                type: true,
                                options: true
                                // Don't select correct_answers!
                            }
                        }
                    }
                }
            }
        });

        if (!test) {
            return res.status(404).json({ error: 'Test not found' });
        }

        if (!test.is_active) {
            return res.status(403).json({ error: 'Test is not active' });
        }

        res.json(test);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new test
router.post('/', async (req, res) => {
    try {
        const { title, slug, questions } = req.body; // questions = [{ id: 'q1', weight: 1 }, ...]

        if (!title || !slug || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ error: 'Title, slug, and questions array are required' });
        }

        // Transaction to create test and link questions
        const test = await prisma.$transaction(async (tx) => {
            const newTest = await tx.test.create({
                data: {
                    title,
                    slug,
                    is_active: true
                }
            });

            for (const q of questions) {
                await tx.testQuestion.create({
                    data: {
                        test_id: newTest.id,
                        question_id: q.id,
                        weight: q.weight || 1
                    }
                });
            }

            return newTest;
        });

        res.json(test);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Slug already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
