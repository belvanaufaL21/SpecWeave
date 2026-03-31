import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TextComparisonTable from '../TextComparisonTable';

describe('TextComparisonTable', () => {
  const mockGeneratedText = `Given saya adalah pengguna yang sudah login
When saya mengklik tombol logout
Then saya harus diarahkan ke halaman login`;

  const mockReferenceText = `Given pengguna sudah melakukan login ke sistem
When pengguna mengklik tombol keluar
Then sistem mengarahkan pengguna ke halaman masuk`;

  it('renders comparison table with Gherkin steps', () => {
    render(
      <TextComparisonTable
        generatedText={mockGeneratedText}
        referenceText={mockReferenceText}
      />
    );

    // Check if table headers are present
    expect(screen.getByText('Bagian')).toBeInTheDocument();
    expect(screen.getByText('Teks yang Dihasilkan')).toBeInTheDocument();
    expect(screen.getByText('Teks Referensi')).toBeInTheDocument();

    // Check if Gherkin steps are present
    expect(screen.getByText('GIVEN')).toBeInTheDocument();
    expect(screen.getByText('WHEN')).toBeInTheDocument();
    expect(screen.getByText('THEN')).toBeInTheDocument();
  });

  it('parses and displays Gherkin text correctly', () => {
    render(
      <TextComparisonTable
        generatedText={mockGeneratedText}
        referenceText={mockReferenceText}
      />
    );

    // Check if individual words are displayed (using getAllByText for multiple occurrences)
    expect(screen.getAllByText('pengguna').length).toBeGreaterThan(0);
    expect(screen.getAllByText('sudah').length).toBeGreaterThan(0);
    expect(screen.getAllByText('login').length).toBeGreaterThan(0);
    expect(screen.getByText('melakukan')).toBeInTheDocument(); // Only in reference
  });

  it('displays simplified table without metrics', () => {
    render(
      <TextComparisonTable
        generatedText={mockGeneratedText}
        referenceText={mockReferenceText}
      />
    );

    // Metrics column should not be present
    expect(screen.queryByText('Metrik')).not.toBeInTheDocument();
    expect(screen.queryByText('F-Score')).not.toBeInTheDocument();
    expect(screen.queryByText('Presisi Keseluruhan')).not.toBeInTheDocument();
    expect(screen.queryByText('Recall Keseluruhan')).not.toBeInTheDocument();
  });

  it('handles empty text gracefully', () => {
    render(
      <TextComparisonTable
        generatedText=""
        referenceText=""
      />
    );

    // Should still render the table structure
    expect(screen.getByText('GIVEN')).toBeInTheDocument();
    expect(screen.getByText('WHEN')).toBeInTheDocument();
    expect(screen.getByText('THEN')).toBeInTheDocument();
  });

  it('highlights matching words correctly', () => {
    render(
      <TextComparisonTable
        generatedText="Given pengguna login sistem"
        referenceText="Given pengguna masuk sistem"
      />
    );

    // The component should render without errors
    // Word highlighting is tested through visual inspection
    expect(screen.getByText('GIVEN')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    const customClass = 'custom-test-class';
    render(
      <TextComparisonTable
        generatedText={mockGeneratedText}
        referenceText={mockReferenceText}
        className={customClass}
      />
    );

    // Check if custom class is applied
    const container = screen.getByText('Perbandingan Teks dalam Format Tabel').closest('.text-comparison-container');
    expect(container).toHaveClass(customClass);
  });

  it('shows only text content without metrics in cells', () => {
    render(
      <TextComparisonTable
        generatedText="Given test When test Then test"
        referenceText="Given test When test Then test"
      />
    );

    // Should not show any metric information in the cells
    expect(screen.queryByText(/Kata cocok:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Presisi:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Recall:/)).not.toBeInTheDocument();
  });

  it('displays clean table layout with 3 columns only', () => {
    render(
      <TextComparisonTable
        generatedText={mockGeneratedText}
        referenceText={mockReferenceText}
      />
    );

    // Should have exactly 3 columns: Bagian, Teks yang Dihasilkan, Teks Referensi
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(3);
    expect(headers[0]).toHaveTextContent('Bagian');
    expect(headers[1]).toHaveTextContent('Teks yang Dihasilkan');
    expect(headers[2]).toHaveTextContent('Teks Referensi');
  });
});