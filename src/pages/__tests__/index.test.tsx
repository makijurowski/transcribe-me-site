import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '../index'

// Mock react-markdown
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown-content">{children}</div>
  }
})

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('renders the main heading and file input', () => {
    render(<Home />)
    
    expect(screen.getByText('📝 TranscribeMe')).toBeInTheDocument()
    expect(screen.getByText('Supports .jpg or .png files')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Transcribe' })).toBeInTheDocument()
    expect(screen.getByText('No output yet.')).toBeInTheDocument()
  })

  it('shows selected files when files are chosen', async () => {
    const user = userEvent.setup()
    render(<Home />)
    
    const fileInput = screen.getByLabelText(/file/i) || screen.getByRole('textbox', { hidden: true })
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    
    await user.upload(fileInput, file)
    
    expect(screen.getByText('Selected Files:')).toBeInTheDocument()
    expect(screen.getByText('📎 test.jpg')).toBeInTheDocument()
  })

  it('disables transcribe button when loading', async () => {
    const user = userEvent.setup()
    render(<Home />)
    
    const fileInput = screen.getByLabelText(/file/i) || screen.getByRole('textbox', { hidden: true })
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    
    await user.upload(fileInput, file)
    
    // Mock a slow API response
    ;(global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ results: [] })
      }), 1000))
    )
    
    const transcribeButton = screen.getByRole('button', { name: 'Transcribe' })
    await user.click(transcribeButton)
    
    expect(screen.getByRole('button', { name: 'Transcribing...' })).toBeDisabled()
  })

  it('displays transcription results', async () => {
    const user = userEvent.setup()
    render(<Home />)
    
    const fileInput = screen.getByLabelText(/file/i) || screen.getByRole('textbox', { hidden: true })
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    
    await user.upload(fileInput, file)
    
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        results: [{
          filename: 'test.jpg',
          text: '# Test Note\n\nThis is a test transcription.'
        }]
      })
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)
    
    const transcribeButton = screen.getByRole('button', { name: 'Transcribe' })
    await user.click(transcribeButton)
    
    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument()
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('# Test Note\n\nThis is a test transcription.')
    })
  })

  it('displays error message when API fails', async () => {
    const user = userEvent.setup()
    render(<Home />)
    
    const fileInput = screen.getByLabelText(/file/i) || screen.getByRole('textbox', { hidden: true })
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    
    await user.upload(fileInput, file)
    
    const mockResponse = {
      ok: false,
      json: () => Promise.resolve({
        error: 'API Error'
      })
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)
    
    const transcribeButton = screen.getByRole('button', { name: 'Transcribe' })
    await user.click(transcribeButton)
    
    await waitFor(() => {
      expect(screen.getByText('⚠️ API Error')).toBeInTheDocument()
    })
  })

  it('handles download functionality', async () => {
    const user = userEvent.setup()
    render(<Home />)
    
    const fileInput = screen.getByLabelText(/file/i) || screen.getByRole('textbox', { hidden: true })
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    
    await user.upload(fileInput, file)
    
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        results: [{
          filename: 'test.jpg',
          text: 'Test transcription content'
        }]
      })
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)
    
    const transcribeButton = screen.getByRole('button', { name: 'Transcribe' })
    await user.click(transcribeButton)
    
    await waitFor(() => {
      const downloadButton = screen.getByTitle('Download transcription')
      expect(downloadButton).toBeInTheDocument()
    })
    
    const downloadButton = screen.getByTitle('Download transcription')
    await user.click(downloadButton)
    
    // Verify that the download was triggered (mocked functions were called)
    expect(document.createElement).toHaveBeenCalledWith('a')
    expect(document.body.appendChild).toHaveBeenCalled()
    expect(document.body.removeChild).toHaveBeenCalled()
  })

  it('does not submit when no files are selected', async () => {
    const user = userEvent.setup()
    render(<Home />)
    
    const transcribeButton = screen.getByRole('button', { name: 'Transcribe' })
    await user.click(transcribeButton)
    
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

// Create a utility function for download
export const downloadText = (filename: string, text: string) => {
  const element = document.createElement('a');
  const file = new Blob([text], {type: 'text/plain'});
  element.href = URL.createObjectURL(file);
  element.download = `${filename.replace(/\.[^/.]+$/, '')}_transcription.txt`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

describe('downloadText utility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create download link with correct filename', () => {
    const mockElement = {
      href: '',
      download: '',
      click: jest.fn(),
    }
    
    ;(document.createElement as jest.Mock).mockReturnValue(mockElement)
    
    downloadText('test.jpg', 'Test content')
    
    expect(document.createElement).toHaveBeenCalledWith('a')
    expect(mockElement.download).toBe('test_transcription.txt')
    expect(mockElement.click).toHaveBeenCalled()
    expect(document.body.appendChild).toHaveBeenCalledWith(mockElement)
    expect(document.body.removeChild).toHaveBeenCalledWith(mockElement)
  })

  it('should handle filenames without extensions', () => {
    const mockElement = {
      href: '',
      download: '',
      click: jest.fn(),
    }
    
    ;(document.createElement as jest.Mock).mockReturnValue(mockElement)
    
    downloadText('test', 'Test content')
    
    expect(mockElement.download).toBe('test_transcription.txt')
  })
}) 