import React from 'react';
import FeatureCard from './FeatureCard';

const features = [
  {
    image: '/screenshots/code-question.png',
    title: 'Rich Question Types',
    description: 'Support for code snippets, markdown, and multiple choice formats.'
  },
  {
    image: '/screenshots/test-management.png',
    title: 'Easy Test Management',
    description: 'Create tests, set pass thresholds, and share with a simple link.'
  },
  {
    image: '/screenshots/candidate-results.png',
    title: 'Track Assessments',
    description: 'Monitor progress and review detailed results in real-time.'
  },
  {
    image: '/screenshots/analytics.png',
    title: 'Built-in Analytics',
    description: 'See success rates and difficulty insights for every question.'
  },
  {
    image: '/screenshots/question-review.png',
    title: 'Detailed Explanations',
    description: 'Review answers with clear feedback on correct and incorrect choices.'
  },
  {
    image: '/screenshots/results-page.png',
    title: 'Instant Results',
    description: 'Candidates see their score immediately after completing the test.'
  }
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-primary mb-12">
          Everything you need to assess skills
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              image={feature.image}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
