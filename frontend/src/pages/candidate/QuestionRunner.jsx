import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import api from '../../lib/api';
import { cn } from '../../lib/utils';

export function QuestionRunner() {
    const { state } = useLocation();
    const { slug } = useParams();
    const navigate = useNavigate();

    const { assessmentId, questions, testTitle } = state || {};
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { questionId: [selectedOptions] }
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Fetch existing answers on mount
    useEffect(() => {
        async function fetchAnswers() {
            if (!assessmentId) {
                setError('Invalid session. Please restart.');
                setLoading(false);
                return;
            }

            try {
                const response = await api.get(`/assessments/${assessmentId}/answers`);
                const existingAnswers = {};
                response.data.answers.forEach(ans => {
                    existingAnswers[ans.question_id] = ans.selected_options;
                });
                setAnswers(existingAnswers);
            } catch (err) {
                console.error('Failed to fetch answers:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchAnswers();
    }, [assessmentId]);

    // Auto-save answer when it changes with debounce
    const saveAnswer = useCallback(async (questionId, selectedOptions) => {
        if (!assessmentId) return;

        setSaving(true);
        try {
            await api.post(`/assessments/${assessmentId}/answer`, {
                question_id: questionId,
                selected_options: selectedOptions,
            });
        } catch (err) {
            console.error('Failed to save answer:', err);
            // Don't block user, just log error
        } finally {
            setSaving(false);
        }
    }, [assessmentId]);

    const handleOptionToggle = (option) => {
        const currentQuestion = questions[currentIndex].question;
        const currentSelected = answers[currentQuestion.id] || [];
        let newSelected;

        if (currentQuestion.type === 'SINGLE') {
            newSelected = [option];
        } else {
            if (currentSelected.includes(option)) {
                newSelected = currentSelected.filter(o => o !== option);
            } else {
                newSelected = [...currentSelected, option];
            }
        }

        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: newSelected
        }));

        // Auto-save with debounce
        setTimeout(() => saveAnswer(currentQuestion.id, newSelected), 300);
    };

    const handleNext = () => {
        if (isLast) {
            handleSubmit();
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        if (!window.confirm('Are you sure you want to submit? You cannot change your answers after submission.')) {
            return;
        }

        setSubmitting(true);
        try {
            // Format answers for API
            const formattedAnswers = questions.map(q => ({
                question_id: q.question.id,
                selected_options: answers[q.question.id] || [],
            }));

            const res = await api.post('/assessments/submit', {
                assessment_id: assessmentId,
                answers: formattedAnswers
            });

            navigate(`/t/${slug}/result`, { state: { result: res.data } });
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to submit assessment');
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="text-center pt-20">Loading your progress...</div>;
    }

    if (error || !assessmentId || !questions || questions.length === 0) {
        return <div className="text-center pt-20 text-red-600">{error || 'Invalid session. Please restart.'}</div>;
    }

    const currentQuestionObj = questions[currentIndex];
    const currentQuestion = currentQuestionObj.question;
    const currentSelected = answers[currentQuestion.id] || [];
    const isLast = currentIndex === questions.length - 1;
    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            {/* Progress Bar */}
            <div className="fixed top-0 left-0 right-0 h-2 bg-gray-200 z-50">
                <div
                    className="h-full bg-tech-blue transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="max-w-3xl mx-auto px-4 pt-8">
                {/* Saving Indicator */}
                {saving && (
                    <div className="text-sm text-gray-500 text-right mb-2">
                        Saving...
                    </div>
                )}

                {/* Question Counter */}
                <div className="text-center mb-6">
                    <p className="text-gray-600">
                        Question {currentIndex + 1} of {questions.length}
                    </p>
                </div>

                {/* Question Card */}
                <Card className="p-8 mb-6">
                    <h2 className="text-2xl font-semibold text-primary-teal mb-6">
                        {currentQuestion.content}
                    </h2>

                    <div className="space-y-3">
                        {currentQuestion.options?.map((option, idx) => {
                            const isMultiple = currentQuestion.type === 'MULTIPLE';
                            const isSelected = currentSelected.includes(option);

                            return (
                                <label
                                    key={idx}
                                    className={cn(
                                        "flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all",
                                        isSelected
                                            ? "border-tech-blue bg-tech-blue/10 text-primary-teal"
                                            : "border-gray-300 hover:border-tech-blue/50"
                                    )}
                                >
                                    <input
                                        type={isMultiple ? 'checkbox' : 'radio'}
                                        name={`question-${currentQuestion.id}`}
                                        value={option}
                                        checked={isSelected}
                                        onChange={() => handleOptionToggle(option)}
                                        className="mr-3 h-5 w-5"
                                    />
                                    <span className="text-lg">{option}</span>
                                </label>
                            );
                        })}
                    </div>
                </Card>

                {/* Navigation */}
                <div className="flex justify-between">
                    <Button
                        variant="secondary"
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                    >
                        Previous
                    </Button>

                    {isLast ? (
                        <Button
                            variant="primary"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : 'Submit Test'}
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            onClick={handleNext}
                        >
                            Next
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
