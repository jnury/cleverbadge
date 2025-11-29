import { describe, it, expect } from 'vitest';
import { getTestDb, getTestSchema } from '../setup.js';
import { getCorrectOptionIds } from '../../utils/options.js';

describe('Assessments Integration Tests', () => {
  const sql = getTestDb();
  const schema = getTestSchema();

  it('should create new assessment (start test)', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440020';
    const candidateName = 'Test Candidate';
    const accessSlug = 'math-geo';

    const result = await sql`
      INSERT INTO ${sql(schema)}.assessments (test_id, candidate_name, status, access_slug)
      VALUES (${testId}, ${candidateName}, 'STARTED', ${accessSlug})
      RETURNING *
    `;

    expect(result).toHaveLength(1);
    expect(result[0].test_id).toBe(testId);
    expect(result[0].candidate_name).toBe(candidateName);
    expect(result[0].status).toBe('STARTED');
    expect(result[0].access_slug).toBe(accessSlug);
    expect(result[0].score_percentage).toBeNull();
    expect(result[0].started_at).toBeDefined();
    expect(result[0].completed_at).toBeNull();
  });

  it('should submit answer for a question', async () => {
    const assessmentId = '550e8400-e29b-41d4-a716-446655440032'; // In-progress assessment
    const questionId = '550e8400-e29b-41d4-a716-446655440010';
    const selectedOptions = [1];

    const result = await sql`
      INSERT INTO ${sql(schema)}.assessment_answers (assessment_id, question_id, selected_options)
      VALUES (${assessmentId}, ${questionId}, ${selectedOptions})
      RETURNING *
    `;

    expect(result).toHaveLength(1);
    expect(result[0].assessment_id).toBe(assessmentId);
    expect(result[0].question_id).toBe(questionId);
    expect(result[0].selected_options).toEqual(selectedOptions);
    expect(result[0].is_correct).toBeNull(); // Not calculated yet
  });

  it('should update existing answer', async () => {
    const assessmentId = '550e8400-e29b-41d4-a716-446655440030'; // Completed assessment
    const questionId = '550e8400-e29b-41d4-a716-446655440010';
    const newSelectedOptions = [2]; // Wrong answer

    // First get the existing answer
    const existing = await sql`
      SELECT * FROM ${sql(schema)}.assessment_answers
      WHERE assessment_id = ${assessmentId} AND question_id = ${questionId}
    `;

    expect(existing).toHaveLength(1);
    const oldOptions = existing[0].selected_options;

    // Update the answer
    const result = await sql`
      UPDATE ${sql(schema)}.assessment_answers
      SET selected_options = ${newSelectedOptions}
      WHERE assessment_id = ${assessmentId} AND question_id = ${questionId}
      RETURNING *
    `;

    expect(result).toHaveLength(1);
    expect(result[0].selected_options).toEqual(newSelectedOptions);
    expect(result[0].selected_options).not.toEqual(oldOptions);
  });

  it('should complete assessment and calculate score', async () => {
    const assessmentId = '550e8400-e29b-41d4-a716-446655440032'; // In-progress assessment
    const testId = '550e8400-e29b-41d4-a716-446655440020';

    // First, add answers
    await sql`
      INSERT INTO ${sql(schema)}.assessment_answers (assessment_id, question_id, selected_options)
      VALUES
        (${assessmentId}, '550e8400-e29b-41d4-a716-446655440011', '[1]'),
        (${assessmentId}, '550e8400-e29b-41d4-a716-446655440012', '[1,3]')
    `;

    // Get all answers with options and weights
    const answers = await sql`
      SELECT
        aa.id,
        aa.question_id,
        aa.selected_options,
        q.options,
        q.type,
        tq.weight
      FROM ${sql(schema)}.assessment_answers aa
      INNER JOIN ${sql(schema)}.questions q ON aa.question_id = q.id
      INNER JOIN ${sql(schema)}.test_questions tq ON tq.question_id = q.id AND tq.test_id = ${testId}
      WHERE aa.assessment_id = ${assessmentId}
    `;

    // Calculate score (manually for test)
    let totalScore = 0;
    let maxScore = 0;

    for (const answer of answers) {
      maxScore += answer.weight;
      // Get correct answers from options using utility function
      const correctAnswers = getCorrectOptionIds(answer.options).map(Number);
      // Simple correctness check
      const correct = JSON.stringify(answer.selected_options.sort()) ===
                      JSON.stringify(correctAnswers.sort());
      if (correct) {
        totalScore += answer.weight;
      }

      // Update is_correct
      await sql`
        UPDATE ${sql(schema)}.assessment_answers
        SET is_correct = ${correct}
        WHERE id = ${answer.id}
      `;
    }

    const scorePercentage = (totalScore / maxScore) * 100;

    // Complete assessment
    const result = await sql`
      UPDATE ${sql(schema)}.assessments
      SET
        status = 'COMPLETED',
        score_percentage = ${scorePercentage.toFixed(2)},
        completed_at = NOW()
      WHERE id = ${assessmentId}
      RETURNING *
    `;

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('COMPLETED');
    expect(result[0].score_percentage).not.toBeNull();
    expect(result[0].completed_at).not.toBeNull();
  });

  it('should verify scoring with weighted questions', async () => {
    const assessmentId = '550e8400-e29b-41d4-a716-446655440030'; // Perfect score assessment

    const assessment = await sql`
      SELECT * FROM ${sql(schema)}.assessments
      WHERE id = ${assessmentId}
    `;

    expect(assessment).toHaveLength(1);
    expect(assessment[0].status).toBe('COMPLETED');
    expect(parseFloat(assessment[0].score_percentage)).toBe(100.0);

    // Verify answers
    const answers = await sql`
      SELECT * FROM ${sql(schema)}.assessment_answers
      WHERE assessment_id = ${assessmentId}
    `;

    expect(answers).toHaveLength(3);
    answers.forEach(answer => {
      expect(answer.is_correct).toBe(true);
    });

    // Check partial score assessment
    const partialAssessmentId = '550e8400-e29b-41d4-a716-446655440031';
    const partialAssessment = await sql`
      SELECT * FROM ${sql(schema)}.assessments
      WHERE id = ${partialAssessmentId}
    `;

    expect(parseFloat(partialAssessment[0].score_percentage)).toBeCloseTo(33.33, 1);
  });
});
