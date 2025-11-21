import { useLocation, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function TestResult() {
    const { state } = useLocation();

    if (!state?.result) {
        return <div className="text-center pt-20">No result found.</div>;
    }

    const { score } = state.result;

    return (
        <div className="max-w-2xl mx-auto pt-20 px-4">
            <Card className="text-center py-12">
                <h1 className="text-4xl font-bold mb-4">Assessment Completed</h1>
                <p className="text-gray-600 mb-8">Thank you for taking the assessment.</p>

                <div className="mb-8">
                    <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">Your Score</div>
                    <div className="text-6xl font-extrabold text-copper">{Math.round(score)}%</div>
                </div>

                <p className="text-gray-500 text-sm">
                    {score >= 70 ? "Great job! You passed." : "Keep practicing and try again."}
                </p>
            </Card>
        </div>
    );
}
