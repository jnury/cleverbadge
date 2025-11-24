import express from 'express';
import multer from 'multer';
import yaml from 'js-yaml';
import { sql, dbSchema } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Accept only .yaml and .yml files
    if (file.mimetype === 'application/x-yaml' ||
        file.mimetype === 'text/yaml' ||
        file.originalname.endsWith('.yaml') ||
        file.originalname.endsWith('.yml')) {
      cb(null, true);
    } else {
      cb(new Error('Only YAML files (.yaml or .yml) are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// POST /api/questions/import
router.post('/import', authenticateToken, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.message === 'Only YAML files (.yaml or .yml) are allowed') {
        return res.status(400).json({ error: err.message });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 5MB limit' });
      }
      return res.status(400).json({ error: 'File upload failed', details: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse YAML
    let parsedData;
    try {
      const fileContent = req.file.buffer.toString('utf8');
      parsedData = yaml.load(fileContent);
    } catch (yamlError) {
      return res.status(400).json({
        error: 'Invalid YAML format',
        details: yamlError.message
      });
    }

    // Validate structure
    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      return res.status(400).json({
        error: 'YAML must contain an array of questions'
      });
    }

    // Validate each question
    const errors = [];
    const validQuestions = [];

    parsedData.forEach((q, index) => {
      const questionNum = index + 1;
      const errs = [];

      // Required fields
      if (!q.text || typeof q.text !== 'string') {
        errs.push(`Question ${questionNum}: 'text' is required and must be a string`);
      }
      if (!q.type || !['SINGLE', 'MULTIPLE'].includes(q.type)) {
        errs.push(`Question ${questionNum}: 'type' must be either 'SINGLE' or 'MULTIPLE'`);
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errs.push(`Question ${questionNum}: 'options' must be an array with at least 2 items`);
      } else {
        // Validate all options are strings
        const invalidOptions = q.options.filter(opt => typeof opt !== 'string');
        if (invalidOptions.length > 0) {
          errs.push(`Question ${questionNum}: all 'options' must be strings`);
        }
      }
      if (!Array.isArray(q.correct_answers) || q.correct_answers.length === 0) {
        errs.push(`Question ${questionNum}: 'correct_answers' must be a non-empty array`);
      } else {
        // Validate all correct_answers are strings
        const invalidAnswers = q.correct_answers.filter(ans => typeof ans !== 'string');
        if (invalidAnswers.length > 0) {
          errs.push(`Question ${questionNum}: all 'correct_answers' must be strings`);
        }
        // Validate correct_answers are in options
        if (Array.isArray(q.options)) {
          const invalidCorrectAnswers = q.correct_answers.filter(ans => !q.options.includes(ans));
          if (invalidCorrectAnswers.length > 0) {
            errs.push(`Question ${questionNum}: 'correct_answers' must match items in 'options'. Invalid: ${invalidCorrectAnswers.join(', ')}`);
          }
        }
      }

      // Optional fields validation
      if (q.tags && !Array.isArray(q.tags)) {
        errs.push(`Question ${questionNum}: 'tags' must be an array if provided`);
      } else if (q.tags) {
        const invalidTags = q.tags.filter(tag => typeof tag !== 'string');
        if (invalidTags.length > 0) {
          errs.push(`Question ${questionNum}: all 'tags' must be strings`);
        }
      }

      if (errs.length > 0) {
        errors.push(...errs);
      } else {
        validQuestions.push({
          text: q.text.trim(),
          type: q.type,
          options: q.options,
          correct_answers: q.correct_answers,
          tags: q.tags || []
        });
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
        valid_count: validQuestions.length,
        invalid_count: parsedData.length - validQuestions.length
      });
    }

    // Bulk insert (transactional)
    const inserted = await sql.begin(async sql => {
      const results = [];
      for (const question of validQuestions) {
        const [insertedQuestion] = await sql`
          INSERT INTO ${sql(dbSchema)}.questions (text, type, options, correct_answers, tags)
          VALUES (${question.text}, ${question.type}, ${question.options}, ${question.correct_answers}, ${question.tags})
          RETURNING *
        `;
        results.push(insertedQuestion);
      }
      return results;
    });

    res.status(201).json({
      message: 'Questions imported successfully',
      imported_count: inserted.length,
      questions: inserted
    });

  } catch (error) {
    console.error('Error importing questions:', error);
    res.status(500).json({ error: 'Failed to import questions' });
  }
});

export default router;
