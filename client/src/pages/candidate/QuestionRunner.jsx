import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import api from '../../lib/api';
import { clsx } from 'clsx';

export function QuestionRunner() {
    const { state } = useLocation();
    const { slug } = useParams();
    const navigate = useNavigate();

    // If accessed directly without state, redirect to landing
    if (!state?.assessmentId) {
        // In a real app, we might try to recover session or redirect
        return <div className="text-center pt-20">Invalid session. Please restart.</div>;
    }

    const { assessmentId, questions, testTitle } = state;
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { questionId: [selectedOptions] }
    const [submitting, setSubmitting] = useState(false);

    const currentQuestionObj = questions[currentIndex];
    const currentQuestion = currentQuestionObj.question;
    const isLast = currentIndex === questions.length - 1;

    const handleOptionToggle = (option) => {
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
    };

    const handleNext = () => {
        if (isLast) {
            handleSubmit();
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            // Format answers for API
            const formattedAnswers = Object.entries(answers).map(([qId, selected]) => ({
                question_id: qId,
                selected_options: selected
            }));

            const res = await api.post('/assessments/submit', {
                assessment_id: assessmentId,
                answers: formattedAnswers
            });

            navigate(`/t/${slug}/result`, { state: { result: res.data } });
        } catch (err) {
            alert('Failed to submit assessment');
            setSubmitting(false);
        }
    };

    const currentSelected = answers[currentQuestion.id] || [];

    return (
        <div className="max-w-3xl mx-auto pt-10 px-4">
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700">{testTitle}</h2>
                <span className="text-sm text-gray-500">Question {currentIndex + 1} of {questions.length}</span>
            </div>

            <Card className="mb-8">
                <h3 className="text-xl font-medium mb-6">{currentQuestion.content}</h3>

                <div className="space-y-3">
                    {currentQuestion.options.map((option, idx) => {
                        const isSelected = currentSelected.includes(option);
                        return (
                            <label
                                key={idx}
                                className={clsx(
                                    "flex items-center p-4 rounded-lg border cursor-pointer transition-all",
                                    isSelected
                                        ? "border-tech-blue bg-primary/5 text-primary"
                                        : "border-gray-200 hover:border-tech-blue/50 hover:bg-gray-50"
                                )}
                            >
                                <input
                                    type={currentQuestion.type === 'SINGLE' ? 'radio' : 'checkbox'}
                                    name={currentQuestion.id}
                                    checked={isSelected}
                                    onChange={() => handleOptionToggle(option)}
                                    className="w-5 h-5 text-copper border-gray-300 focus:ring-tech-blue mr-3"
                                />
                                <span>{option}</span>
                            </label>
                        );
                    })}
                </div>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleNext} disabled={submitting}>
                    {isLast ? (submitting ? 'Submitting...' : 'Submit Assessment') : 'Next Question'}
                </Button>
            </div>
        </div>
    );
}
