import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import api from '../../lib/api';

export function AdminDashboard() {
    const [tests, setTests] = useState([]);
    const [yamlContent, setYamlContent] = useState('');
    const [importStatus, setImportStatus] = useState(null);

    useEffect(() => {
        loadTests();
    }, []);

    const loadTests = () => {
        api.get('/tests')
            .then(res => setTests(res.data))
            .catch(console.error);
    };

    const handleImport = async () => {
        try {
            const res = await api.post('/questions/import', { yamlContent });
            setImportStatus({ type: 'success', message: `Imported ${res.data.results.success} questions.` });
            setYamlContent('');
        } catch (err) {
            setImportStatus({ type: 'error', message: err.response?.data?.error || 'Import failed' });
        }
    };

    return (
        <div className="max-w-4xl mx-auto pt-10 px-4 pb-20">
            <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Tests List */}
                <div>
                    <h2 className="text-xl font-semibold mb-4">Active Tests</h2>
                    <div className="space-y-4">
                        {tests.map(test => (
                            <Card key={test.id} className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-medium text-lg">{test.title}</h3>
                                        <p className="text-sm text-gray-500">/{test.slug}</p>
                                        <p className="text-xs text-gray-400 mt-1">{test._count?.questions || 0} questions</p>
                                    </div>
                                    <a
                                        href={`/t/${test.slug}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary hover:text-primary/80 text-sm font-medium"
                                    >
                                        Open Link &rarr;
                                    </a>
                                </div>
                            </Card>
                        ))}
                        {tests.length === 0 && <p className="text-gray-500">No tests created yet.</p>}
                    </div>
                </div>

                {/* Import Questions */}
                <div>
                    <h2 className="text-xl font-semibold mb-4">Import Questions</h2>
                    <Card>
                        <textarea
                            className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-tech-blue focus:outline-none"
                            placeholder="Paste YAML content here..."
                            value={yamlContent}
                            onChange={(e) => setYamlContent(e.target.value)}
                        />
                        <div className="mt-4 flex justify-between items-center">
                            <Button onClick={handleImport} disabled={!yamlContent}>
                                Import YAML
                            </Button>
                            {importStatus && (
                                <span className={importStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}>
                                    {importStatus.message}
                                </span>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
