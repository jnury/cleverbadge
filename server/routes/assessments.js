const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Start an assessment
router.post('/start', async (req, res) => {
    try {
        const { test_id, candidate_name } = req.body;

        if (!test_id) {
            return res.status(400).json({ error: 'test_id is required' });
        }

        const assessment = await prisma.assessment.create({
            data: {
                test_id,
                candidate_name: candidate_name || 'Anonymous',
                status: 'STARTED'
            }
        });

        res.json(assessment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Submit an assessment
router.post('/submit', async (req, res) => {
    try {
        const { assessment_id, answers } = req.body; // answers = [{ question_id, selected_options: [] }]

        if (!assessment_id || !answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'assessment_id and answers array are required' });
        }

        // Fetch assessment to get test_id
        const assessment = await prisma.assessment.findUnique({
            where: { id: assessment_id },
            include: { test: true }
        });

        if (!assessment) {
            return res.status(404).json({ error: 'Assessment not found' });
        }

        if (assessment.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Assessment already completed' });
        }

        // Fetch all questions for this test with weights and correct answers
        const testQuestions = await prisma.testQuestion.findMany({
            where: { test_id: assessment.test_id },
            include: { question: true }
        });

        let totalScore = 0;
        let maxScore = 0;
        const processedAnswers = [];

        // Create a map for quick lookup
        const questionMap = new Map(testQuestions.map(tq => [tq.question_id, tq]));

        for (const ans of answers) {
            const tq = questionMap.get(ans.question_id);
            if (!tq) continue; // Skip answers to questions not in this test

            const question = tq.question;
            const weight = tq.weight;
            const correct = question.correct_answers || [];
            const selected = ans.selected_options || [];

            maxScore += weight;

            // Scoring Logic
            let isCorrect = false;
            if (question.type === 'SINGLE') {
                // Single choice: Exact string match
                if (selected.length === 1 && correct.includes(selected[0])) {
                    isCorrect = true;
                }
            } else if (question.type === 'MULTIPLE') {
                // Multiple choice: Arrays must contain exact same elements
                // Sort both and compare stringified
                const sortedCorrect = [...correct].sort();
                const sortedSelected = [...selected].sort();
                if (JSON.stringify(sortedCorrect) === JSON.stringify(sortedSelected)) {
                    isCorrect = true;
                }
            }

            if (isCorrect) {
                totalScore += weight;
            }

            processedAnswers.push({
                assessment_id,
                question_id: ans.question_id,
                selected_options: selected
            });
        }

        // Calculate percentage
        const finalPercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

        // Update Assessment in DB
        const updatedAssessment = await prisma.$transaction(async (tx) => {
            // Save answers
            await tx.assessmentAnswer.createMany({
                data: processedAnswers
            });

            // Update assessment status and score
            return await tx.assessment.update({
                where: { id: assessment_id },
                data: {
                    status: 'COMPLETED',
                    score: finalPercentage
                }
            });
        });

        res.json({
            message: 'Assessment submitted',
            score: finalPercentage,
            assessment: updatedAssessment
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
