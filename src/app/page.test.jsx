import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
}));

import Home from '../app/page.jsx';

describe('Home (auth page)', () => {
  it('renders the app title', () => {
    render(<Home />);
    expect(screen.getByText(/heureka/i)).toBeInTheDocument();
  });

  it('renders email and password inputs', () => {
    render(<Home />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  it('renders role selector (student/teacher)', () => {
    render(<Home />);
    expect(screen.getByRole('radio', { name: /student/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /teacher/i })).toBeInTheDocument();
  });
});
