import { render, screen } from '@testing-library/react';
import App from './App';

test('renders photo hub heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/photo hub/i);
  expect(headingElement).toBeInTheDocument();
});
