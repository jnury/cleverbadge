import express from 'express';
import { sql, dbSchema } from '../db/index.js';

const router = express.Router();

// GET all questions
router.get('/', async (req, res) => {
  try {
    const allQuestions = await sql.unsafe(`
      SELECT * FROM ${dbSchema}.questions
      ORDER BY created_at DESC
    `);
    res.json({ questions: allQuestions, total: allQuestions.length });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// GET question by ID
router.get('/:id', async (req, res) => {
  try {
    const questions = await sql.unsafe(`
      SELECT * FROM ${dbSchema}.questions
      WHERE id = $1
    `, [req.params.id]);

    if (questions.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json(questions[0]);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

// POST create question
router.post('/', async (req, res) => {
  try {
    const { text, type, options, correct_answers, tags } = req.body;

    // Basic validation
    if (!text || !type || !options || !correct_answers) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['SINGLE', 'MULTIPLE'].includes(type)) {
      return res.status(400).json({ error: 'Type must be SINGLE or MULTIPLE' });
    }

    const newQuestions = await sql.unsafe(`
      INSERT INTO ${dbSchema}.questions (text, type, options, correct_answers, tags)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [text, type, options, correct_answers, tags || []]);

    res.status(201).json(newQuestions[0]);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// PUT update question
router.put('/:id', async (req, res) => {
  try {
    const { text, type, options, correct_answers, tags } = req.body;

    const updatedQuestions = await sql.unsafe(`
      UPDATE ${dbSchema}.questions
      SET
        text = $1,
        type = $2,
        options = $3,
        correct_answers = $4,
        tags = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [text, type, options, correct_answers, tags, req.params.id]);

    if (updatedQuestions.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json(updatedQuestions[0]);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// DELETE question
router.delete('/:id', async (req, res) => {
  try {
    const deletedQuestions = await sql.unsafe(`
      DELETE FROM ${dbSchema}.questions
      WHERE id = $1
      RETURNING *
    `, [req.params.id]);

    if (deletedQuestions.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ message: 'Question deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

export default router;
