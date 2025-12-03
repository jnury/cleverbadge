import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuestionRunner from '../../src/pages/QuestionRunner';
import * as router from 'react-router-dom';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useParams: vi.fn(),
        useNavigate: vi.fn(),
        useLocation: vi.fn(),
    };
});

// Mock MarkdownRenderer to simplify testing
vi.mock('../../src/components/MarkdownRenderer', () => ({
    default: ({ content }) => <div data-testid="markdown-content">{content}</div>
}));

// Mock assessmentStorage
vi.mock('../../src/utils/assessmentStorage', () => ({
    saveAssessment: vi.fn(),
    clearAssessment: vi.fn()
}));

describe('QuestionRunner Component', () => {
    const mockNavigate = vi.fn();
    const mockQuestions = [
        {
            id: 'q1',
            title: 'Question 1',
            text: 'What is 2 + 2?',
            type: 'SINGLE',
            options: [
                { id: 'opt1', text: '3' },
                { id: 'opt2', text: '4' }
            ]
        },
        {
            id: 'q2',
            title: 'Question 2',
            text: 'Select even numbers',
            type: 'MULTIPLE',
            options: [
                { id: 'opt3', text: '1' },
                { id: 'opt4', text: '2' },
                { id: 'opt5', text: '4' }
            ]
        }
    ];

    const defaultState = {
        assessmentId: 'test-assessment-id',
        questions: mockQuestions,
        candidateName: 'John Doe',
        testSlug: 'math-test',
        currentQuestionIndex: 0,
        answers: {}
    };

    beforeEach(() => {
        vi.clearAllMocks();
        router.useNavigate.mockReturnValue(mockNavigate);
        router.useParams.mockReturnValue({ slug: 'math-test' });
        router.useLocation.mockReturnValue({ state: defaultState });
        global.fetch = vi.fn();
    });

    it('should render the first question correctly', () => {
        render(<QuestionRunner />);

        expect(screen.getByText('Question 1')).toBeInTheDocument();
        expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
        expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should handle single choice selection', () => {
        render(<QuestionRunner />);

        const option3 = screen.getByText('3');
        fireEvent.click(option3);

        // Check if visual state updated (border class)
        // Note: We can't easily check internal state, but we can check if the option looks selected
        // The component adds 'border-tech' class to selected options
        const optionContainer = option3.closest('div.border-2');
        expect(optionContainer).toHaveClass('border-tech');

        // Click another option
        const option4 = screen.getByText('4');
        fireEvent.click(option4);

        expect(optionContainer).not.toHaveClass('border-tech');
        expect(option4.closest('div.border-2')).toHaveClass('border-tech');
    });

    it('should handle multiple choice selection', () => {
        // Start at second question
        router.useLocation.mockReturnValue({
            state: {
                ...defaultState,
                currentQuestionIndex: 1
            }
        });

        render(<QuestionRunner />);

        expect(screen.getByText('Select even numbers')).toBeInTheDocument();

        const opt2 = screen.getByText('2');
        const opt4 = screen.getByText('4');

        fireEvent.click(opt2);
        expect(opt2.closest('div.border-2')).toHaveClass('border-tech');

        fireEvent.click(opt4);
        expect(opt4.closest('div.border-2')).toHaveClass('border-tech');
        // Both should be selected
        expect(opt2.closest('div.border-2')).toHaveClass('border-tech');
    });

    it('should navigate to next question and save answer', async () => {
        global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

        render(<QuestionRunner />);

        // Select an answer
        fireEvent.click(screen.getByText('4'));

        // Click Next
        const nextButton = screen.getByText('Next');
        fireEvent.click(nextButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/assessments/test-assessment-id/answer'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"selected_options":["opt2"]')
                })
            );
        });

        // Should now be on question 2
        expect(screen.getByText('Question 2')).toBeInTheDocument();
    });

    it('should submit the test', async () => {
        // Start at last question
        router.useLocation.mockReturnValue({
            state: {
                ...defaultState,
                currentQuestionIndex: 1,
                answers: { 'q1': ['opt2'] } // Previous answer
            }
        });

        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                score_percentage: 100,
                pass_threshold: 70
            })
        });

        render(<QuestionRunner />);

        // Select answer for last question
        fireEvent.click(screen.getByText('2'));

        // Click Submit Test
        const submitButton = screen.getByText('Submit Test');
        fireEvent.click(submitButton);

        // Modal should appear
        expect(screen.getByText('Submit Test?')).toBeInTheDocument();

        // Confirm submit
        const confirmButton = screen.getAllByText('Submit Test')[1]; // Second one is in modal
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/assessments/test-assessment-id/submit'),
                expect.objectContaining({ method: 'POST' })
            );
        });

        // Should navigate to results
        expect(mockNavigate).toHaveBeenCalledWith(
            '/t/math-test/result',
            expect.objectContaining({
                state: expect.objectContaining({
                    score: 100
                })
            })
        );
    });
});
