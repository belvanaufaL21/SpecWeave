import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MeteorMetricsDetail from '../MeteorMetricsDetail';

// Mock test result with detailed METEOR metrics
const mockTestResult = {
  score: 0.75,
  detailed_metrics: {
    precision: 0.8,
    recall: 0.7,
    f_mean: 0.747,
    meteor_score: 0.75,
    matches: 14,
    chunks: 3,
    penalty: 0.027,
    explanation: {
      precision_desc: "Proporsi kata dalam teks yang dihasilkan yang cocok dengan referensi: 14/18 = 0.8",
      recall_desc: "Proporsi kata dalam teks referensi yang tertangkap oleh teks yang dihasilkan: 14/20 = 0.7",
      f_mean_desc: "Rata-rata harmonik dari presisi dan recall: 2×(0.8×0.7)/(0.8+0.7) = 0.747",
      penalty_desc: "Penalti urutan kata berdasarkan 3 chunks dari 14 matches: 0.5×(3/14)³ = 0.027",
      final_score_desc: "Skor METEOR final: 0.747 × (1 - 0.027) = 0.75"
    }
  }
};

const mockTestResultWithoutDetails = {
  score: 0.65
};

describe('MeteorMetricsDetail', () => {
  it('should render METEOR score and quality level', () => {
    render(<MeteorMetricsDetail testResult={mockTestResult} />);
    
    // Check main score display - use more specific selectors
    expect(screen.getByText('Skor METEOR')).toBeInTheDocument();
    expect(screen.getByText('Baik')).toBeInTheDocument();
    
    // Check for the percentage in the main score area
    const scoreElements = screen.getAllByText('75.0%');
    expect(scoreElements.length).toBeGreaterThan(0);
  });

  it('should display all detailed metrics with correct values', () => {
    render(<MeteorMetricsDetail testResult={mockTestResult} />);
    
    // Check all metric sections
    expect(screen.getByText('1. Presisi (Precision)')).toBeInTheDocument();
    expect(screen.getByText('80.0%')).toBeInTheDocument(); // Precision
    
    expect(screen.getByText('2. Recall')).toBeInTheDocument();
    expect(screen.getByText('70.0%')).toBeInTheDocument(); // Recall
    
    expect(screen.getByText('3. F-Mean (F-Score)')).toBeInTheDocument();
    expect(screen.getByText('74.7%')).toBeInTheDocument(); // F-Mean
    
    expect(screen.getByText('4. Penalti Urutan Kata (Chunk Penalty)')).toBeInTheDocument();
    expect(screen.getByText('2.7%')).toBeInTheDocument(); // Penalty
    
    expect(screen.getByText('5. Skor METEOR Final')).toBeInTheDocument();
  });

  it('should show detailed explanations when showExplanation is true', () => {
    render(<MeteorMetricsDetail testResult={mockTestResult} showExplanation={true} />);
    
    // Check if explanation boxes are present - use more specific text
    expect(screen.getByText(/Proporsi kata dalam teks yang dihasilkan yang cocok dengan referensi/)).toBeInTheDocument();
    expect(screen.getByText(/Proporsi kata dalam teks referensi yang tertangkap/)).toBeInTheDocument();
    expect(screen.getByText(/2×\(0\.8×0\.7\)\/\(0\.8\+0\.7\) = 0\.747/)).toBeInTheDocument();
    expect(screen.getByText(/Penalti urutan kata berdasarkan/)).toBeInTheDocument();
    expect(screen.getByText(/Skor METEOR final/)).toBeInTheDocument();
  });

  it('should hide explanations when showExplanation is false', () => {
    render(<MeteorMetricsDetail testResult={mockTestResult} showExplanation={false} />);
    
    // Explanations should not be present
    expect(screen.queryByText(/Perhitungan:/)).not.toBeInTheDocument();
  });

  it('should display correct quality levels for different scores', () => {
    const testCases = [
      { score: 0.95, expected: 'Sangat Baik' },
      { score: 0.75, expected: 'Baik' },
      { score: 0.55, expected: 'Cukup' },
      { score: 0.35, expected: 'Kurang' },
      { score: 0.15, expected: 'Sangat Kurang' }
    ];

    testCases.forEach(({ score, expected }) => {
      const testResult = {
        ...mockTestResult,
        score
      };
      
      const { unmount } = render(<MeteorMetricsDetail testResult={testResult} />);
      expect(screen.getByText(expected)).toBeInTheDocument();
      unmount();
    });
  });

  it('should show interpretation and recommendations', () => {
    render(<MeteorMetricsDetail testResult={mockTestResult} />);
    
    expect(screen.getByText('Interpretasi Hasil')).toBeInTheDocument();
    expect(screen.getByText('Kekuatan:')).toBeInTheDocument();
    expect(screen.getByText('Area Perbaikan:')).toBeInTheDocument();
    expect(screen.getByText('Rekomendasi Umum:')).toBeInTheDocument();
  });

  it('should display appropriate strengths based on metrics', () => {
    render(<MeteorMetricsDetail testResult={mockTestResult} />);
    
    // With precision 0.8 and recall 0.7, should show strengths
    expect(screen.getByText('• Presisi tinggi - kata yang dihasilkan relevan')).toBeInTheDocument();
    expect(screen.getByText('• Recall tinggi - informasi penting tercakup')).toBeInTheDocument();
  });

  it('should display appropriate improvement areas based on metrics', () => {
    const lowScoreResult = {
      ...mockTestResult,
      detailed_metrics: {
        ...mockTestResult.detailed_metrics,
        precision: 0.5,
        recall: 0.4,
        penalty: 0.15
      }
    };

    render(<MeteorMetricsDetail testResult={lowScoreResult} />);
    
    // With low scores, should show improvement areas
    expect(screen.getByText('• Kurangi kata yang tidak relevan')).toBeInTheDocument();
    expect(screen.getByText('• Tambahkan informasi penting yang hilang')).toBeInTheDocument();
    expect(screen.getByText('• Perbaiki urutan kata agar lebih konsisten')).toBeInTheDocument();
  });

  it('should return null when testResult has no detailed_metrics', () => {
    const { container } = render(<MeteorMetricsDetail testResult={mockTestResultWithoutDetails} />);
    expect(container.firstChild).toBeNull();
  });

  it('should return null when testResult is null or undefined', () => {
    const { container: container1 } = render(<MeteorMetricsDetail testResult={null} />);
    expect(container1.firstChild).toBeNull();
    
    const { container: container2 } = render(<MeteorMetricsDetail testResult={undefined} />);
    expect(container2.firstChild).toBeNull();
  });

  it('should display chunks and matches information', () => {
    render(<MeteorMetricsDetail testResult={mockTestResult} />);
    
    expect(screen.getByText(/Chunks:/)).toBeInTheDocument();
    expect(screen.getByText(/Matches:/)).toBeInTheDocument();
    
    // Check for chunks and matches values in the specific context
    const chunksSection = screen.getByText(/Chunks:/).parentElement;
    expect(chunksSection).toHaveTextContent('3');
    expect(chunksSection).toHaveTextContent('14');
  });

  it('should provide appropriate recommendations based on score', () => {
    // High score test
    const highScoreResult = { ...mockTestResult, score: 0.85 };
    const { unmount: unmount1 } = render(<MeteorMetricsDetail testResult={highScoreResult} />);
    expect(screen.getByText(/Skenario sudah berkualitas baik/)).toBeInTheDocument();
    unmount1();

    // Medium score test
    const mediumScoreResult = { ...mockTestResult, score: 0.65 };
    const { unmount: unmount2 } = render(<MeteorMetricsDetail testResult={mediumScoreResult} />);
    expect(screen.getByText(/Skenario cukup baik tetapi masih ada ruang perbaikan/)).toBeInTheDocument();
    unmount2();

    // Low score test
    const lowScoreResult = { ...mockTestResult, score: 0.45 };
    render(<MeteorMetricsDetail testResult={lowScoreResult} />);
    expect(screen.getByText(/Skenario perlu perbaikan signifikan/)).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<MeteorMetricsDetail testResult={mockTestResult} />);
    
    // Check for proper heading structure
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(2); // "Detail Metrik" and "Interpretasi Hasil"
    expect(screen.getAllByRole('heading', { level: 5 })).toHaveLength(8); // All metric sections + interpretation sections (updated count)
  });

  it('should handle missing explanation gracefully', () => {
    const resultWithoutExplanation = {
      ...mockTestResult,
      detailed_metrics: {
        precision: 0.8,
        recall: 0.7,
        f_mean: 0.747,
        meteor_score: 0.75,
        matches: 14,
        chunks: 3,
        penalty: 0.027
        // No explanation object
      }
    };

    render(<MeteorMetricsDetail testResult={resultWithoutExplanation} showExplanation={true} />);
    
    // Should still render the component without explanations
    expect(screen.getByText('Skor METEOR')).toBeInTheDocument();
    expect(screen.getByText('1. Presisi (Precision)')).toBeInTheDocument();
    
    // But no explanation boxes should be present
    expect(screen.queryByText(/Perhitungan:/)).not.toBeInTheDocument();
  });
});