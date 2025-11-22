import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full p-12 text-center">
        <img
          src="/logo_small.png"
          alt="Clever Badge"
          className="h-32 mx-auto mb-6"
        />
        <h1 className="text-5xl font-bold text-primary-teal mb-4">
          Clever Badge
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Online Skills Assessment Platform
        </p>

        <div className="space-y-4 max-w-md mx-auto">
          <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>For Candidates:</strong> If you have a test link, click it to start your assessment.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Test links look like: <code className="bg-white px-2 py-1 rounded">/t/test-name</code>
            </p>
          </div>

          <Link to="/login" className="block">
            <Button variant="primary" className="w-full">
              Admin Login
            </Button>
          </Link>

          <div className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Assess technical skills with confidence
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
