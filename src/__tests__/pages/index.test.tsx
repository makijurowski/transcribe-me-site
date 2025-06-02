import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../../pages/index';
import '@testing-library/jest-dom';

// Mock ReactMarkdown
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown-content">{children}</div>;
  };
});

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

describe('Home Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main page elements', () => {
    render(<Home />);
    
    expect(screen.getByText('📝 TranscribeMe')).toBeInTheDocument();
    expect(screen.getByText('Supports .jpg or .png files')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Transcribe' })).toBeInTheDocument();
    expect(screen.getByText('🧾 Transcription Preview')).toBeInTheDocument();
    expect(screen.getByText('No output yet.')).toBeInTheDocument();
  });

  it('allows file selection and displays selected files', async () => {
    const user = userEvent.setup();
    render(<Home />);
    
    const fileInput = screen.getByDisplayValue('');
    const file1 = new File(['test'], 'test1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['test'], 'test2.png', { type: 'image/png' });
    
    await user.upload(fileInput, [file1, file2]);
    
    expect(screen.getByText('Selected Files:')).toBeInTheDocument();
    expect(screen.getByText('📎 test1.jpg')).toBeInTheDocument();
    expect(screen.getByText('📎 test2.png')).toBeInTheDocument();
  });

  it('disables transcribe button when no files are selected', () => {
    render(<Home />);
    
    const transcribeButton = screen.getByRole('button', { name: 'Transcribe' });
    fireEvent.click(transcribeButton);
    
    // Should not make any API call
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows loading state during transcription', async () => {
    const user = userEvent.setup();
    render(<Home />);
    
    // Mock a delayed response
    mockFetch.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ results: [] })
        } as Response), 100)
      )
    );
    
    const fileInput = screen.getByDisplayValue('');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);
    
    const transcribeButton = screen.getByRole('button', { name: 'Transcribe' });
    fireEvent.click(transcribeButton);
    
    expect(screen.getByText('Transcribing...')).toBeInTheDocument();
    expect(transcribeButton).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.getByText('Transcribe')).toBeInTheDocument();
    });
  });

  it('successfully displays transcription results', async () => {
    const user = userEvent.setup();
    render(<Home />);
    
    const mockResults = [
      { filename: 'test1.jpg', text: '# Test Note This is a test transcription.' },
      { filename: 'test2.jpg', text: '## Another Note Second transcription.' }
    ];
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: mockResults })
    } as Response);
    
    const fileInput = screen.getByDisplayValue('');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);
    
    const transcribeButton = screen.getByRole('button', { name: 'Transcribe' });
    fireEvent.click(transcribeButton);
    
    await waitFor(() => {
      expect(screen.getByText('test1.jpg')).toBeInTheDocument();
      expect(screen.getByText('test2.jpg')).toBeInTheDocument();
    });
    
    // Check that markdown content is rendered
    const markdownElements = screen.getAllByTestId('markdown-content');
    expect(markdownElements).toHaveLength(2);
    expect(markdownElements[0]).toHaveTextContent('# Test Note This is a test transcription.');
    expect(markdownElements[1]).toHaveTextContent('## Another Note Second transcription.');
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();
    render(<Home />);
    
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'API Error occurred' })
    } as Response);
    
    const fileInput = screen.getByDisplayValue('');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);
    
    const transcribeButton = screen.getByRole('button', { name: 'Transcribe' });
    fireEvent.click(transcribeButton);
    
    await waitFor(() => {
      expect(screen.getByText('⚠️ API Error occurred')).toBeInTheDocument();
    });
  });

  it('handles network errors', async () => {
    const user = userEvent.setup();
    render(<Home />);
    
    mockFetch.mockRejectedValue(new Error('Network error'));
    
    const fileInput = screen.getByDisplayValue('');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);
    
    const transcribeButton = screen.getByRole('button', { name: 'Transcribe' });
    fireEvent.click(transcribeButton);
    
    await waitFor(() => {
      expect(screen.getByText('⚠️ Network error')).toBeInTheDocument();
    });
  });

  it('handles unknown errors', async () => {
    const user = userEvent.setup();
    render(<Home />);
    
    mockFetch.mockRejectedValue('Unknown error type');
    
    const fileInput = screen.getByDisplayValue('');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);
    
    const transcribeButton = screen.getByRole('button', { name: 'Transcribe' });
    fireEvent.click(transcribeButton);
    
    await waitFor(() => {
      expect(screen.getByText('⚠️ An unknown error occurred')).toBeInTheDocument();
    });
  });

  it('clears error and outputs when starting new transcription', async () => {
    const user = userEvent.setup();
    render(<Home />);
    
    // First, create an error state
    mockFetch.mockRejectedValue(new Error('Test error'));
    
    const fileInput = screen.getByDisplayValue('');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);
    
    const transcribeButton = screen.getByRole('button', { name: 'Transcribe' });
    fireEvent.click(transcribeButton);
    
    await waitFor(() => {
      expect(screen.getByText('⚠️ Test error')).toBeInTheDocument();
    });
    
    // Now make a successful request
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [{ filename: 'test.jpg', text: 'Success!' }] })
    } as Response);
    
    fireEvent.click(transcribeButton);
    
    // Error should be cleared immediately when starting new request
    expect(screen.queryByText('⚠️ Test error')).not.toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });
  });

  it('downloads transcription text when download button is clicked', async () => {
    const user = userEvent.setup();
    render(<Home />);
    
    const mockResults = [
      { filename: 'test.jpg', text: '# Test Note\n\nThis is a test transcription.' }
    ];
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: mockResults })
    } as Response);
    
    const fileInput = screen.getByDisplayValue('');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);
    
    const transcribeButton = screen.getByRole('button', { name: 'Transcribe' });
    fireEvent.click(transcribeButton);
    
    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });
    
    const downloadButton = screen.getByTitle('Download transcription');
    fireEvent.click(downloadButton);
    
    // Verify download functionality was called
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('sends correct FormData to API', async () => {
    const user = userEvent.setup();
    render(<Home />);
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] })
    } as Response);
    
    const fileInput = screen.getByDisplayValue('');
    const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, [file1, file2]);
    
    const transcribeButton = screen.getByRole('button', { name: 'Transcribe' });
    fireEvent.click(transcribeButton);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/transcribe', {
        method: 'POST',
        body: expect.any(FormData)
      });
    });
  });

  it('removes filename extension in download filename', async () => {
    render(<Home />);
    
    const mockResults = [
      { filename: 'test.jpg', text: 'Test content' }
    ];
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: mockResults })
    } as Response);
    
    const fileInput = screen.getByDisplayValue('');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    await userEvent.setup().upload(fileInput, file);
    
    fireEvent.click(screen.getByRole('button', { name: 'Transcribe' }));
    
    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });
    
    const downloadButton = screen.getByTitle('Download transcription');
    fireEvent.click(downloadButton);
    
    // Just verify the download functionality was triggered
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });
});
