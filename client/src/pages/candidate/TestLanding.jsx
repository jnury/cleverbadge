import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import api from '../../lib/api';

export function TestLanding() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [name, setName] = useState('');

    useEffect(() => {
        api.get(`/tests/${slug}`)
            .then(res => setTest(res.data))
            .catch(err => setError(err.response?.data?.error || 'Failed to load test'))
            .finally(() => setLoading(false));
    }, [slug]);

    const handleStart = async () => {
        try {
            const res = await api.post('/assessments/start', {
                test_id: test.id,
                candidate_name: name || 'Anonymous'
            });
            // Store assessment ID and questions in state/context or pass via navigation state
            // For simplicity, we'll pass via navigation state
            navigate(`/t/${slug}/run`, {
                state: {
                    assessmentId: res.data.id,
                    questions: test.questions,
                    testTitle: test.title
                }
            });
        } catch (err) {
            alert('Failed to start assessment');
        }
    };

    if (loading) return <div className="text-center pt-20">Loading...</div>;
    if (error) return <div className="text-center pt-20 text-red-600">{error}</div>;

    return (
        <div className="max-w-2xl mx-auto pt-20 px-4">
            <Card className="text-center">
                <h1 className="text-3xl font-bold mb-4">{test.title}</h1>
                <p className="text-gray-600 mb-8">You are about to start the assessment.</p>

                <div className="max-w-xs mx-auto mb-6">
                    <label className="block text-left text-sm font-medium text-gray-700 mb-1">Your Name (Optional)</label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                    />
                </div>

                <Button onClick={handleStart}>
                    Start Assessment
                </Button>
            </Card>
        </div>
    );
}
