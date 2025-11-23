import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getCurrentUser } from '../../utils/api';
import TestsTab from './TestsTab';
import QuestionsTab from './QuestionsTab';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [activeTab, setActiveTab] = useState('tests');

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const tabs = [
    { id: 'tests', label: 'Tests' },
    { id: 'questions', label: 'Questions' },
    { id: 'assessments', label: 'Assessments' },
    { id: 'analytics', label: 'Analytics' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome, {user?.username}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-tech text-tech'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'tests' && <TestsTab />}
          {activeTab === 'questions' && <QuestionsTab />}
          {activeTab === 'assessments' && (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Assessments</h2>
              <p className="text-gray-600">Content coming in Phase 3</p>
            </div>
          )}
          {activeTab === 'analytics' && (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Analytics</h2>
              <p className="text-gray-600">Content coming in Phase 3</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
