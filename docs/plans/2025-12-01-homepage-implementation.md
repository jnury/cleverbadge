# Homepage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a minimalist landing page for CleverBadge and restructure admin routes to `/dashboard`.

**Architecture:** Two-phase implementation: Phase 1 (v1.x) creates the landing page with existing `/admin` routes, Phase 2 (v2) renames routes to `/dashboard` and adds login modal.

**Tech Stack:** React, React Router, Tailwind CSS, Vite

---

## Phase 1: Landing Page (v1.x)

### Task 1.1: Copy Media Assets to Public Folder

**Files:**
- Copy: `media/logo.png` → `frontend/public/logo.png`
- Copy: `media/App_ScreenShot_03.png` → `frontend/public/screenshots/test-management.png`
- Copy: `media/App_ScreenShot_04.png` → `frontend/public/screenshots/candidate-results.png`
- Copy: `media/App_ScreenShot_05.png` → `frontend/public/screenshots/analytics.png`
- Copy: `media/App_ScreenShot_06.png` → `frontend/public/screenshots/code-question.png`

**Step 1: Create screenshots directory and copy files**

```bash
mkdir -p frontend/public/screenshots
cp media/logo.png frontend/public/logo.png
cp media/App_ScreenShot_03.png frontend/public/screenshots/test-management.png
cp media/App_ScreenShot_04.png frontend/public/screenshots/candidate-results.png
cp media/App_ScreenShot_05.png frontend/public/screenshots/analytics.png
cp media/App_ScreenShot_06.png frontend/public/screenshots/code-question.png
```

**Step 2: Verify files exist**

```bash
ls -la frontend/public/logo.png frontend/public/screenshots/
```

Expected: All 5 files listed.

**Step 3: Commit**

```bash
git add frontend/public/logo.png frontend/public/screenshots/
git commit -m "assets: add logo and screenshots for landing page"
```

---

### Task 1.2: Create FeatureCard Component

**Files:**
- Create: `frontend/src/components/landing/FeatureCard.jsx`
- Test: `frontend/tests/components/FeatureCard.test.jsx`

**Step 1: Write the failing test**

Create `frontend/tests/components/FeatureCard.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeatureCard from '../../src/components/landing/FeatureCard';

describe('FeatureCard', () => {
  const defaultProps = {
    image: '/screenshots/test.png',
    title: 'Test Title',
    description: 'Test description text'
  };

  it('renders image with correct src', () => {
    render(<FeatureCard {...defaultProps} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/screenshots/test.png');
  });

  it('renders title', () => {
    render(<FeatureCard {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<FeatureCard {...defaultProps} />);
    expect(screen.getByText('Test description text')).toBeInTheDocument();
  });

  it('has hover animation class', () => {
    const { container } = render(<FeatureCard {...defaultProps} />);
    const card = container.firstChild;
    expect(card).toHaveClass('hover:-translate-y-1');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- tests/components/FeatureCard.test.jsx
```

Expected: FAIL - Cannot find module

**Step 3: Create component directory and file**

Create `frontend/src/components/landing/FeatureCard.jsx`:

```jsx
import React from 'react';

const FeatureCard = ({ image, title, description }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-200 hover:-translate-y-1">
      <div className="aspect-video bg-gray-100 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover object-top"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg text-primary mb-1">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </div>
  );
};

export default FeatureCard;
```

**Step 4: Run test to verify it passes**

```bash
cd frontend && npm test -- tests/components/FeatureCard.test.jsx
```

Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add frontend/src/components/landing/FeatureCard.jsx frontend/tests/components/FeatureCard.test.jsx
git commit -m "feat: add FeatureCard component for landing page"
```

---

### Task 1.3: Create HeroSection Component

**Files:**
- Create: `frontend/src/components/landing/HeroSection.jsx`
- Test: `frontend/tests/components/HeroSection.test.jsx`

**Step 1: Write the failing test**

Create `frontend/tests/components/HeroSection.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HeroSection from '../../src/components/landing/HeroSection';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('HeroSection', () => {
  it('renders logo', () => {
    renderWithRouter(<HeroSection />);
    const logo = screen.getByAltText('Clever Badge');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/logo.png');
  });

  it('renders headline', () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByText('Create tests. Share links. Get results.')).toBeInTheDocument();
  });

  it('renders subheadline', () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByText(/simple platform to assess skills/i)).toBeInTheDocument();
  });

  it('renders Try Demo button with link to demo test', () => {
    renderWithRouter(<HeroSection />);
    const button = screen.getByRole('link', { name: /try a sample test/i });
    expect(button).toHaveAttribute('href', '/t/demo');
  });

  it('renders features link', () => {
    renderWithRouter(<HeroSection />);
    const link = screen.getByRole('link', { name: /learn more about features/i });
    expect(link).toHaveAttribute('href', '#features');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- tests/components/HeroSection.test.jsx
```

Expected: FAIL - Cannot find module

**Step 3: Create HeroSection component**

Create `frontend/src/components/landing/HeroSection.jsx`:

```jsx
import React from 'react';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4">
      <div className="text-center max-w-2xl mx-auto">
        {/* Logo */}
        <img
          src="/logo.png"
          alt="Clever Badge"
          className="w-32 h-32 md:w-40 md:h-40 mx-auto mb-8"
        />

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
          Create tests. Share links. Get results.
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-gray-600 mb-8">
          A simple platform to assess skills with multiple-choice questions.
          Perfect for recruiters, educators, and tech teams.
        </p>

        {/* Primary CTA */}
        <Link
          to="/t/demo"
          className="inline-block px-8 py-3 bg-tech text-white font-medium rounded-lg hover:bg-tech/90 transition-colors text-lg mb-4"
        >
          Try a Sample Test
        </Link>

        {/* Secondary link */}
        <div>
          <a
            href="#features"
            className="text-tech hover:underline text-sm"
          >
            or learn more about features
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 animate-bounce">
        <svg
          className="w-6 h-6 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
```

**Step 4: Run test to verify it passes**

```bash
cd frontend && npm test -- tests/components/HeroSection.test.jsx
```

Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add frontend/src/components/landing/HeroSection.jsx frontend/tests/components/HeroSection.test.jsx
git commit -m "feat: add HeroSection component for landing page"
```

---

### Task 1.4: Create FeaturesSection Component

**Files:**
- Create: `frontend/src/components/landing/FeaturesSection.jsx`
- Test: `frontend/tests/components/FeaturesSection.test.jsx`

**Step 1: Write the failing test**

Create `frontend/tests/components/FeaturesSection.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeaturesSection from '../../src/components/landing/FeaturesSection';

describe('FeaturesSection', () => {
  it('has features id for anchor navigation', () => {
    const { container } = render(<FeaturesSection />);
    const section = container.querySelector('#features');
    expect(section).toBeInTheDocument();
  });

  it('renders section title', () => {
    render(<FeaturesSection />);
    expect(screen.getByText('Everything you need to assess skills')).toBeInTheDocument();
  });

  it('renders all four feature cards', () => {
    render(<FeaturesSection />);
    expect(screen.getByText('Rich Question Types')).toBeInTheDocument();
    expect(screen.getByText('Easy Test Management')).toBeInTheDocument();
    expect(screen.getByText('Track Candidates')).toBeInTheDocument();
    expect(screen.getByText('Built-in Analytics')).toBeInTheDocument();
  });

  it('renders four images', () => {
    render(<FeaturesSection />);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(4);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- tests/components/FeaturesSection.test.jsx
```

Expected: FAIL - Cannot find module

**Step 3: Create FeaturesSection component**

Create `frontend/src/components/landing/FeaturesSection.jsx`:

```jsx
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
    title: 'Track Candidates',
    description: 'Monitor progress and review detailed results in real-time.'
  },
  {
    image: '/screenshots/analytics.png',
    title: 'Built-in Analytics',
    description: 'See success rates and difficulty insights for every question.'
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
```

**Step 4: Run test to verify it passes**

```bash
cd frontend && npm test -- tests/components/FeaturesSection.test.jsx
```

Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add frontend/src/components/landing/FeaturesSection.jsx frontend/tests/components/FeaturesSection.test.jsx
git commit -m "feat: add FeaturesSection component with feature grid"
```

---

### Task 1.5: Create CTASection Component

**Files:**
- Create: `frontend/src/components/landing/CTASection.jsx`
- Test: `frontend/tests/components/CTASection.test.jsx`

**Step 1: Write the failing test**

Create `frontend/tests/components/CTASection.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CTASection from '../../src/components/landing/CTASection';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('CTASection', () => {
  it('renders headline', () => {
    renderWithRouter(<CTASection />);
    expect(screen.getByText('Ready to get started?')).toBeInTheDocument();
  });

  it('renders subtext', () => {
    renderWithRouter(<CTASection />);
    expect(screen.getByText(/try a sample test to see how it works/i)).toBeInTheDocument();
  });

  it('renders Try Sample Test button', () => {
    renderWithRouter(<CTASection />);
    const button = screen.getByRole('link', { name: /try sample test/i });
    expect(button).toHaveAttribute('href', '/t/demo');
  });

  it('renders Login button', () => {
    renderWithRouter(<CTASection />);
    const button = screen.getByRole('link', { name: /login/i });
    expect(button).toHaveAttribute('href', '/admin/login');
  });

  it('has teal background', () => {
    const { container } = renderWithRouter(<CTASection />);
    const section = container.firstChild;
    expect(section).toHaveClass('bg-tech');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- tests/components/CTASection.test.jsx
```

Expected: FAIL - Cannot find module

**Step 3: Create CTASection component**

Create `frontend/src/components/landing/CTASection.jsx`:

```jsx
import React from 'react';
import { Link } from 'react-router-dom';

const CTASection = () => {
  return (
    <section className="bg-tech py-16 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Ready to get started?
        </h2>
        <p className="text-white/90 mb-8">
          Try a sample test to see how it works, or log in to create your own.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/t/demo"
            className="px-6 py-3 bg-white text-tech font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Try Sample Test
          </Link>
          <Link
            to="/admin/login"
            className="px-6 py-3 border-2 border-white text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
```

**Step 4: Run test to verify it passes**

```bash
cd frontend && npm test -- tests/components/CTASection.test.jsx
```

Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add frontend/src/components/landing/CTASection.jsx frontend/tests/components/CTASection.test.jsx
git commit -m "feat: add CTASection component for landing page"
```

---

### Task 1.6: Create Navigation Component

**Files:**
- Create: `frontend/src/components/landing/Navigation.jsx`
- Test: `frontend/tests/components/Navigation.test.jsx`

**Step 1: Write the failing test**

Create `frontend/tests/components/Navigation.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navigation from '../../src/components/landing/Navigation';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Navigation', () => {
  it('renders logo', () => {
    renderWithRouter(<Navigation />);
    const logo = screen.getByAltText('Clever Badge');
    expect(logo).toBeInTheDocument();
  });

  it('renders Clever Badge text', () => {
    renderWithRouter(<Navigation />);
    expect(screen.getByText('Clever Badge')).toBeInTheDocument();
  });

  it('renders Features link', () => {
    renderWithRouter(<Navigation />);
    const link = screen.getByRole('link', { name: /features/i });
    expect(link).toHaveAttribute('href', '#features');
  });

  it('renders Try Demo button', () => {
    renderWithRouter(<Navigation />);
    const button = screen.getByRole('link', { name: /try demo/i });
    expect(button).toHaveAttribute('href', '/t/demo');
  });

  it('renders Login button', () => {
    renderWithRouter(<Navigation />);
    const button = screen.getByRole('link', { name: /login/i });
    expect(button).toHaveAttribute('href', '/admin/login');
  });

  it('is fixed position', () => {
    const { container } = renderWithRouter(<Navigation />);
    const nav = container.firstChild;
    expect(nav).toHaveClass('fixed');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- tests/components/Navigation.test.jsx
```

Expected: FAIL - Cannot find module

**Step 3: Create Navigation component**

Create `frontend/src/components/landing/Navigation.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled ? 'bg-white shadow-md' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="Clever Badge" className="w-8 h-8" />
            <span className="font-bold text-primary">Clever Badge</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <a
              href="#features"
              className="text-gray-600 hover:text-primary transition-colors"
            >
              Features
            </a>
            <Link
              to="/t/demo"
              className="text-gray-600 hover:text-primary transition-colors"
            >
              Try Demo
            </Link>
            <Link
              to="/admin/login"
              className="px-4 py-2 bg-tech text-white rounded-lg hover:bg-tech/90 transition-colors"
            >
              Login
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col space-y-4">
              <a
                href="#features"
                className="text-gray-600 hover:text-primary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </a>
              <Link
                to="/t/demo"
                className="text-gray-600 hover:text-primary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Try Demo
              </Link>
              <Link
                to="/admin/login"
                className="px-4 py-2 bg-tech text-white rounded-lg hover:bg-tech/90 transition-colors text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
```

**Step 4: Run test to verify it passes**

```bash
cd frontend && npm test -- tests/components/Navigation.test.jsx
```

Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add frontend/src/components/landing/Navigation.jsx frontend/tests/components/Navigation.test.jsx
git commit -m "feat: add Navigation component with sticky header"
```

---

### Task 1.7: Rewrite Home Page

**Files:**
- Modify: `frontend/src/pages/Home.jsx`
- Modify: `frontend/tests/components/Home.test.jsx`

**Step 1: Update Home test**

Replace `frontend/tests/components/Home.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from '../../src/pages/Home';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Home', () => {
  it('renders navigation', () => {
    renderWithRouter(<Home />);
    const navLogo = screen.getAllByAltText('Clever Badge')[0];
    expect(navLogo).toBeInTheDocument();
  });

  it('renders hero section with headline', () => {
    renderWithRouter(<Home />);
    expect(screen.getByText('Create tests. Share links. Get results.')).toBeInTheDocument();
  });

  it('renders features section', () => {
    renderWithRouter(<Home />);
    expect(screen.getByText('Everything you need to assess skills')).toBeInTheDocument();
  });

  it('renders CTA section', () => {
    renderWithRouter(<Home />);
    expect(screen.getByText('Ready to get started?')).toBeInTheDocument();
  });

  it('has smooth scroll behavior', () => {
    const { container } = renderWithRouter(<Home />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('scroll-smooth');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- tests/components/Home.test.jsx
```

Expected: FAIL - expected elements not found

**Step 3: Rewrite Home component**

Replace `frontend/src/pages/Home.jsx`:

```jsx
import React from 'react';
import Navigation from '../components/landing/Navigation';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import CTASection from '../components/landing/CTASection';

const Home = () => {
  return (
    <div className="scroll-smooth">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <CTASection />
    </div>
  );
};

export default Home;
```

**Step 4: Run test to verify it passes**

```bash
cd frontend && npm test -- tests/components/Home.test.jsx
```

Expected: PASS (5 tests)

**Step 5: Run all frontend tests**

```bash
cd frontend && npm test
```

Expected: All tests pass

**Step 6: Commit**

```bash
git add frontend/src/pages/Home.jsx frontend/tests/components/Home.test.jsx
git commit -m "feat: rewrite Home page with landing page layout"
```

---

### Task 1.8: Update App Layout for Home Page

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Check current behavior**

The current App.jsx wraps all pages in a fixed layout with Footer. The new Home page should be full-width without the default layout constraints.

**Step 2: Update App.jsx to handle Home page differently**

Replace `frontend/src/App.jsx`:

```jsx
import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import EnvironmentBanner from './components/EnvironmentBanner';
import Footer from './components/Footer';
import Home from './pages/Home';
import TestLanding from './pages/TestLanding';
import QuestionRunner from './pages/QuestionRunner';
import TestResults from './pages/TestResults';
import AdminLogin from './pages/admin/AdminLogin';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
import AssessmentDetail from './pages/admin/AssessmentDetail';

const AppContent = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  // Home page has its own layout (Navigation, Footer via CTASection)
  if (isHomePage) {
    return (
      <>
        <EnvironmentBanner />
        <Home />
        <Footer />
      </>
    );
  }

  // All other pages use standard layout
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <EnvironmentBanner />
      <main className="flex-1">
        <Routes>
          <Route path="/t/:slug" element={<TestLanding />} />
          <Route path="/t/:slug/run" element={<QuestionRunner />} />
          <Route path="/t/:slug/result" element={<TestResults />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/assessment/:assessmentId" element={
            <ProtectedRoute>
              <AssessmentDetail />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route path="/" element={
          <>
            <EnvironmentBanner />
            <Home />
            <Footer />
          </>
        } />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

**Step 3: Run all tests**

```bash
cd frontend && npm test
```

Expected: All tests pass

**Step 4: Manual verification**

```bash
cd frontend && npm run dev
```

Open http://localhost:5173 and verify:
- Navigation is visible and sticky
- Hero section displays with logo and CTA
- Features section shows 4 cards with screenshots
- CTA section has teal background
- Footer displays at bottom

**Step 5: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: update App layout for new landing page"
```

---

### Task 1.9: Bump Frontend Version to 1.8.0

**Files:**
- Modify: `frontend/package.json`

**Step 1: Update version**

Change version from `1.7.1` to `1.8.0` in `frontend/package.json`.

**Step 2: Commit**

```bash
git add frontend/package.json
git commit -m "chore: bump frontend version to 1.8.0"
```

---

### Task 1.10: Run Full Test Suite and Create Phase 1 Tag

**Step 1: Run backend tests**

```bash
cd backend && npm test
```

Expected: All tests pass

**Step 2: Run frontend tests**

```bash
cd frontend && npm test
```

Expected: All tests pass

**Step 3: Create git tag for Phase 1**

```bash
git tag -a v1.8.0 -m "feat: landing page implementation"
```

---

## Phase 2: Dashboard Rename and Login Modal (v2.0)

### Task 2.1: Create LoginModal Component

**Files:**
- Create: `frontend/src/components/LoginModal.jsx`
- Test: `frontend/tests/components/LoginModal.test.jsx`

**Step 1: Write the failing test**

Create `frontend/tests/components/LoginModal.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginModal from '../../src/components/LoginModal';

// Mock the api module
vi.mock('../../src/utils/api', () => ({
  login: vi.fn(),
  isLoggedIn: vi.fn(() => false)
}));

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('LoginModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = renderWithRouter(
      <LoginModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when open', () => {
    renderWithRouter(
      <LoginModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('renders username and password fields', () => {
    renderWithRouter(
      <LoginModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderWithRouter(
      <LoginModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('calls onClose when clicking overlay', () => {
    renderWithRouter(
      <LoginModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );
    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- tests/components/LoginModal.test.jsx
```

Expected: FAIL - Cannot find module

**Step 3: Create LoginModal component**

Create `frontend/src/components/LoginModal.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, isLoggedIn } from '../utils/api';
import Modal from './ui/Modal';

const LoginModal = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  // Check if already logged in
  useEffect(() => {
    if (isOpen && isLoggedIn()) {
      onClose();
      navigate('/dashboard');
    }
  }, [isOpen, navigate, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username.trim(), password);
      onClose();
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Overlay */}
        <div
          data-testid="modal-overlay"
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-primary">Login</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="login-username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tech focus:border-transparent"
                placeholder="Enter username"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tech focus:border-transparent"
                placeholder="Enter password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-tech text-white font-medium rounded-md hover:bg-tech/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tech disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
```

**Step 4: Run test to verify it passes**

```bash
cd frontend && npm test -- tests/components/LoginModal.test.jsx
```

Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add frontend/src/components/LoginModal.jsx frontend/tests/components/LoginModal.test.jsx
git commit -m "feat: add LoginModal component"
```

---

### Task 2.2: Update Navigation to Use Login Modal

**Files:**
- Modify: `frontend/src/components/landing/Navigation.jsx`
- Modify: `frontend/tests/components/Navigation.test.jsx`

**Step 1: Update test**

Update `frontend/tests/components/Navigation.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navigation from '../../src/components/landing/Navigation';

// Mock api
vi.mock('../../src/utils/api', () => ({
  isLoggedIn: vi.fn(() => false),
  login: vi.fn()
}));

import { isLoggedIn } from '../../src/utils/api';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLoggedIn.mockReturnValue(false);
  });

  it('renders logo', () => {
    renderWithRouter(<Navigation />);
    const logo = screen.getByAltText('Clever Badge');
    expect(logo).toBeInTheDocument();
  });

  it('renders Clever Badge text', () => {
    renderWithRouter(<Navigation />);
    expect(screen.getByText('Clever Badge')).toBeInTheDocument();
  });

  it('renders Features link', () => {
    renderWithRouter(<Navigation />);
    const link = screen.getByRole('link', { name: /features/i });
    expect(link).toHaveAttribute('href', '#features');
  });

  it('renders Try Demo link', () => {
    renderWithRouter(<Navigation />);
    const link = screen.getByRole('link', { name: /try demo/i });
    expect(link).toHaveAttribute('href', '/t/demo');
  });

  describe('when not logged in', () => {
    it('renders Login button', () => {
      renderWithRouter(<Navigation />);
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('opens login modal when Login clicked', () => {
      renderWithRouter(<Navigation />);
      const loginBtn = screen.getByRole('button', { name: /login/i });
      fireEvent.click(loginBtn);
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });
  });

  describe('when logged in', () => {
    beforeEach(() => {
      isLoggedIn.mockReturnValue(true);
    });

    it('renders Dashboard link instead of Login', () => {
      renderWithRouter(<Navigation />);
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /login/i })).not.toBeInTheDocument();
    });

    it('Dashboard link points to /dashboard', () => {
      renderWithRouter(<Navigation />);
      const link = screen.getByRole('link', { name: /dashboard/i });
      expect(link).toHaveAttribute('href', '/dashboard');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- tests/components/Navigation.test.jsx
```

Expected: FAIL - expected Dashboard link

**Step 3: Update Navigation component**

Replace `frontend/src/components/landing/Navigation.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { isLoggedIn } from '../../utils/api';
import LoginModal from '../LoginModal';

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(isLoggedIn());

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 ${
          isScrolled ? 'bg-white shadow-md' : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <img src="/logo.png" alt="Clever Badge" className="w-8 h-8" />
              <span className="font-bold text-primary">Clever Badge</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <a
                href="#features"
                className="text-gray-600 hover:text-primary transition-colors"
              >
                Features
              </a>
              <Link
                to="/t/demo"
                className="text-gray-600 hover:text-primary transition-colors"
              >
                Try Demo
              </Link>
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="px-4 py-2 bg-tech text-white rounded-lg hover:bg-tech/90 transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-4 py-2 bg-tech text-white rounded-lg hover:bg-tech/90 transition-colors"
                >
                  Login
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-gray-600"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100 bg-white">
              <div className="flex flex-col space-y-4">
                <a
                  href="#features"
                  className="text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Features
                </a>
                <Link
                  to="/t/demo"
                  className="text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Try Demo
                </Link>
                {isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    className="px-4 py-2 bg-tech text-white rounded-lg hover:bg-tech/90 transition-colors text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsLoginModalOpen(true);
                    }}
                    className="px-4 py-2 bg-tech text-white rounded-lg hover:bg-tech/90 transition-colors"
                  >
                    Login
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </>
  );
};

export default Navigation;
```

**Step 4: Run test to verify it passes**

```bash
cd frontend && npm test -- tests/components/Navigation.test.jsx
```

Expected: PASS (8 tests)

**Step 5: Commit**

```bash
git add frontend/src/components/landing/Navigation.jsx frontend/tests/components/Navigation.test.jsx
git commit -m "feat: update Navigation to use login modal and show Dashboard when logged in"
```

---

### Task 2.3: Update CTASection for Authentication State

**Files:**
- Modify: `frontend/src/components/landing/CTASection.jsx`
- Modify: `frontend/tests/components/CTASection.test.jsx`

**Step 1: Update test**

Replace `frontend/tests/components/CTASection.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CTASection from '../../src/components/landing/CTASection';

// Mock api
vi.mock('../../src/utils/api', () => ({
  isLoggedIn: vi.fn(() => false),
  login: vi.fn()
}));

import { isLoggedIn } from '../../src/utils/api';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('CTASection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLoggedIn.mockReturnValue(false);
  });

  it('renders headline', () => {
    renderWithRouter(<CTASection />);
    expect(screen.getByText('Ready to get started?')).toBeInTheDocument();
  });

  it('renders Try Sample Test button', () => {
    renderWithRouter(<CTASection />);
    const button = screen.getByRole('link', { name: /try sample test/i });
    expect(button).toHaveAttribute('href', '/t/demo');
  });

  describe('when not logged in', () => {
    it('renders Login button', () => {
      renderWithRouter(<CTASection />);
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('opens login modal when Login clicked', () => {
      renderWithRouter(<CTASection />);
      fireEvent.click(screen.getByRole('button', { name: /login/i }));
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });
  });

  describe('when logged in', () => {
    beforeEach(() => {
      isLoggedIn.mockReturnValue(true);
    });

    it('renders Go to Dashboard link', () => {
      renderWithRouter(<CTASection />);
      const link = screen.getByRole('link', { name: /go to dashboard/i });
      expect(link).toHaveAttribute('href', '/dashboard');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- tests/components/CTASection.test.jsx
```

Expected: FAIL - expected Login button

**Step 3: Update CTASection component**

Replace `frontend/src/components/landing/CTASection.jsx`:

```jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { isLoggedIn } from '../../utils/api';
import LoginModal from '../LoginModal';

const CTASection = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const isAuthenticated = isLoggedIn();

  return (
    <>
      <section className="bg-tech py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-white/90 mb-8">
            Try a sample test to see how it works, or log in to create your own.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/t/demo"
              className="px-6 py-3 bg-white text-tech font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Try Sample Test
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-6 py-3 border-2 border-white text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-6 py-3 border-2 border-white text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </section>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
};

export default CTASection;
```

**Step 4: Run test to verify it passes**

```bash
cd frontend && npm test -- tests/components/CTASection.test.jsx
```

Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add frontend/src/components/landing/CTASection.jsx frontend/tests/components/CTASection.test.jsx
git commit -m "feat: update CTASection for authentication state"
```

---

### Task 2.4: Rename Admin Routes to Dashboard

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/ProtectedRoute.jsx`
- Rename: `frontend/src/pages/admin/` → `frontend/src/pages/dashboard/`
- Remove: `frontend/src/pages/admin/AdminLogin.jsx`

**Step 1: Update ProtectedRoute**

Replace `frontend/src/components/ProtectedRoute.jsx`:

```jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../utils/api';

/**
 * ProtectedRoute - Redirects to homepage with login modal trigger if not authenticated
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  if (!isLoggedIn()) {
    // Redirect to home with state to trigger login modal
    return <Navigate to="/" state={{ openLoginModal: true, from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
```

**Step 2: Rename admin directory to dashboard**

```bash
cd frontend/src/pages
mv admin dashboard
```

**Step 3: Rename AdminDashboard to Dashboard**

```bash
cd frontend/src/pages/dashboard
mv AdminDashboard.jsx Dashboard.jsx
```

**Step 4: Update Dashboard.jsx imports/references**

In `frontend/src/pages/dashboard/Dashboard.jsx`, change the component name from `AdminDashboard` to `Dashboard` and update any `/admin` references to `/dashboard`.

**Step 5: Remove AdminLogin.jsx**

```bash
rm frontend/src/pages/dashboard/AdminLogin.jsx
```

**Step 6: Update all files in dashboard directory**

Update any `/admin` path references to `/dashboard` in:
- `Dashboard.jsx`
- `AssessmentDetail.jsx`
- Any other files with admin references

**Step 7: Update App.jsx**

Replace `frontend/src/App.jsx`:

```jsx
import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import EnvironmentBanner from './components/EnvironmentBanner';
import Footer from './components/Footer';
import Home from './pages/Home';
import TestLanding from './pages/TestLanding';
import QuestionRunner from './pages/QuestionRunner';
import TestResults from './pages/TestResults';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/dashboard/Dashboard';
import AssessmentDetail from './pages/dashboard/AssessmentDetail';

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route path="/" element={
          <>
            <EnvironmentBanner />
            <Home />
            <Footer />
          </>
        } />
        <Route path="/*" element={
          <div className="min-h-screen flex flex-col bg-gray-50">
            <EnvironmentBanner />
            <main className="flex-1">
              <Routes>
                <Route path="/t/:slug" element={<TestLanding />} />
                <Route path="/t/:slug/run" element={<QuestionRunner />} />
                <Route path="/t/:slug/result" element={<TestResults />} />

                {/* Dashboard routes (formerly admin) */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/assessment/:assessmentId" element={
                  <ProtectedRoute>
                    <AssessmentDetail />
                  </ProtectedRoute>
                } />
              </Routes>
            </main>
            <Footer />
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

**Step 8: Run all tests**

```bash
cd frontend && npm test
```

Fix any failing tests related to path changes.

**Step 9: Commit**

```bash
git add -A
git commit -m "refactor: rename admin routes to dashboard"
```

---

### Task 2.5: Update API Redirect Path

**Files:**
- Modify: `frontend/src/utils/api.js`

**Step 1: Update 401 redirect path**

In `frontend/src/utils/api.js`, change:

```javascript
if (!window.location.pathname.includes('/admin/login')) {
  window.location.href = '/admin/login';
}
```

To:

```javascript
if (window.location.pathname.startsWith('/dashboard')) {
  window.location.href = '/';
}
```

**Step 2: Run tests**

```bash
cd frontend && npm test
```

**Step 3: Commit**

```bash
git add frontend/src/utils/api.js
git commit -m "fix: update 401 redirect to homepage"
```

---

### Task 2.6: Update Home Page to Handle Login Modal Trigger

**Files:**
- Modify: `frontend/src/pages/Home.jsx`

**Step 1: Update Home to check for login modal trigger from redirect**

Replace `frontend/src/pages/Home.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navigation from '../components/landing/Navigation';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import CTASection from '../components/landing/CTASection';
import LoginModal from '../components/LoginModal';

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Check if redirected from protected route
  useEffect(() => {
    if (location.state?.openLoginModal) {
      setIsLoginModalOpen(true);
      // Clear the state to prevent reopening on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false);
    // Redirect to original destination or dashboard
    const from = location.state?.from?.pathname || '/dashboard';
    navigate(from);
  };

  return (
    <div className="scroll-smooth">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <CTASection />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default Home;
```

**Step 2: Run tests**

```bash
cd frontend && npm test
```

**Step 3: Commit**

```bash
git add frontend/src/pages/Home.jsx
git commit -m "feat: handle login modal trigger from protected route redirect"
```

---

### Task 2.7: Update E2E Tests for New Routes

**Files:**
- Modify: `frontend/tests/e2e/*.spec.js` files

**Step 1: Find E2E tests with admin references**

```bash
grep -r "/admin" frontend/tests/e2e/
```

**Step 2: Update each file**

Replace all `/admin/login` with login via modal flow.
Replace all `/admin` with `/dashboard`.

**Step 3: Run E2E tests**

```bash
./scripts/start-test.sh
./scripts/e2e-tests.sh
./scripts/stop-test.sh
```

**Step 4: Fix any failing tests**

**Step 5: Commit**

```bash
git add frontend/tests/e2e/
git commit -m "test: update E2E tests for dashboard routes"
```

---

### Task 2.8: Bump Versions for v2.0

**Files:**
- Modify: `frontend/package.json`
- Modify: `backend/package.json`

**Step 1: Update frontend version to 2.0.0**

**Step 2: Update backend version to 2.0.0**

**Step 3: Run all tests**

```bash
cd backend && npm test
cd frontend && npm test
```

**Step 4: Commit**

```bash
git add frontend/package.json backend/package.json
git commit -m "chore: bump versions to 2.0.0"
```

---

### Task 2.9: Final Verification and Tag

**Step 1: Run full test suite**

```bash
cd backend && npm test
cd frontend && npm test
./scripts/start-test.sh
./scripts/e2e-tests.sh
./scripts/stop-test.sh
```

**Step 2: Manual verification**

- Visit homepage, verify landing page displays
- Click Login, verify modal opens
- Login with admin/admin123
- Verify redirected to /dashboard
- Verify Navigation shows "Dashboard" instead of "Login"
- Logout, verify Login button returns
- Try accessing /dashboard when logged out, verify redirect to homepage with modal

**Step 3: Create git tag**

```bash
git tag -a v2.0.0 -m "feat: dashboard rename and login modal"
```

---

## Summary

**Phase 1 (v1.8.0):** Landing page with existing admin routes
- 10 tasks
- New components: FeatureCard, HeroSection, FeaturesSection, CTASection, Navigation
- Rewritten Home page

**Phase 2 (v2.0.0):** Dashboard rename and login modal
- 9 tasks
- New component: LoginModal
- Route changes: /admin → /dashboard
- Login via modal instead of separate page
