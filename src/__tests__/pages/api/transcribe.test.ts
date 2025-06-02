import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/transcribe';
import { IncomingForm } from 'formidable';
import fs from 'fs';

// Mock dependencies
jest.mock('formidable');
jest.mock('fs');
jest.mock('node:fs', () => jest.requireActual('fs'));

const mockIncomingForm = IncomingForm as jest.MockedClass<typeof IncomingForm>;
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

interface MockIncomingFormInstance {
  parse: jest.MockedFunction<(req: unknown, callback: (err: Error | null, fields: unknown, files: unknown) => void) => void>;
}

interface MockResponse {
  ok: boolean;
  status?: number;
  json: jest.MockedFunction<() => Promise<{
    choices: Array<{
      message: {
        content: string;
      };
    }>;
  }>>;
  text?: jest.MockedFunction<() => Promise<string>>;
}

describe('/api/transcribe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('should return 400 for no files', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    const mockParse = jest.fn((req, callback) => {
      callback(null, {}, { files: [] });
    });
    mockIncomingForm.mockImplementation(() => ({
      parse: mockParse,
    } as MockIncomingFormInstance));

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: "No valid files uploaded."
    });
  });

  it('should successfully transcribe a single file', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    const mockParse = jest.fn((req, callback) => {
      callback(null, {}, {
        files: {
          originalFilename: 'test.jpg',
          mimetype: 'image/jpeg',
          filepath: '/tmp/test.jpg'
        }
      });
    });
    mockIncomingForm.mockImplementation(() => ({
      parse: mockParse,
    } as MockIncomingFormInstance));

    const mockBuffer = Buffer.from('fake-image-data');
    mockFs.readFileSync.mockReturnValue(mockBuffer);

    const mockOpenAIResponse: MockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: '# Test Note\n\nThis is a transcribed note.'
          }
        }]
      })
    };
    mockFetch.mockResolvedValue(mockOpenAIResponse as Response);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());
    expect(responseData.results).toHaveLength(1);
    expect(responseData.results[0].filename).toBe('test.jpg');
    expect(responseData.results[0].text).toBe('# Test Note\n\nThis is a transcribed note.');
  });

  it('should handle multiple files', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    // Mock formidable to return multiple files
    const mockParse = jest.fn((req, callback) => {
      callback(null, {}, {
        files: [
          {
            originalFilename: 'test1.jpg',
            mimetype: 'image/jpeg',
            filepath: '/tmp/test1.jpg'
          },
          {
            originalFilename: 'test2.jpg',
            mimetype: 'image/jpeg',
            filepath: '/tmp/test2.jpg'
          }
        ]
      });
    });
    mockIncomingForm.mockImplementation(() => ({
      parse: mockParse,
    } as MockIncomingFormInstance));

    const mockBuffer = Buffer.from('fake-image-data');
    mockFs.readFileSync.mockReturnValue(mockBuffer);

    const mockOpenAIResponse: MockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: 'Transcribed content'
          }
        }]
      })
    };
    mockFetch.mockResolvedValue(mockOpenAIResponse as Response);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());
    expect(responseData.results).toHaveLength(2);
    expect(responseData.results[0].filename).toBe('test1.jpg');
    expect(responseData.results[1].filename).toBe('test2.jpg');
  });

  it('should handle OpenAI API errors gracefully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    const mockParse = jest.fn((req, callback) => {
      callback(null, {}, {
        files: {
          originalFilename: 'test.jpg',
          mimetype: 'image/jpeg',
          filepath: '/tmp/test.jpg'
        }
      });
    });
    mockIncomingForm.mockImplementation(() => ({
      parse: mockParse,
    } as MockIncomingFormInstance));

    const mockBuffer = Buffer.from('fake-image-data');
    mockFs.readFileSync.mockReturnValue(mockBuffer);

    // Mock OpenAI API error
    const mockOpenAIResponse: Partial<MockResponse> = {
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('Internal Server Error')
    };
    mockFetch.mockResolvedValue(mockOpenAIResponse as Response);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());
    expect(responseData.results[0]).toEqual({
      filename: 'test.jpg',
      text: expect.stringContaining('Error: Failed to transcribe this file')
    });
  });

  it('should handle missing OpenAI response content', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    const mockParse = jest.fn((req, callback) => {
      callback(null, {}, {
        files: {
          originalFilename: 'test.jpg',
          mimetype: 'image/jpeg',
          filepath: '/tmp/test.jpg'
        }
      });
    });
    mockIncomingForm.mockImplementation(() => ({
      parse: mockParse,
    } as MockIncomingFormInstance));

    const mockBuffer = Buffer.from('fake-image-data');
    mockFs.readFileSync.mockReturnValue(mockBuffer);

    // Mock OpenAI API response without content
    const mockOpenAIResponse: MockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: []
      })
    };
    mockFetch.mockResolvedValue(mockOpenAIResponse as Response);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());
    expect(responseData.results[0].text).toContain('No transcription received from OpenAI');
  });

  it('should handle formidable parsing errors', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    // Mock formidable to throw an error
    const mockParse = jest.fn((req, callback) => {
      callback(new Error('Parsing failed'), null, null);
    });
    mockIncomingForm.mockImplementation(() => ({
      parse: mockParse,
    } as MockIncomingFormInstance));

    await expect(handler(req, res)).rejects.toThrow('Parsing failed');
  });

  it('should handle files without original filename', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    const mockParse = jest.fn((req, callback) => {
      callback(null, {}, {
        files: {
          // no originalFilename
          mimetype: 'image/jpeg',
          filepath: '/tmp/test.jpg'
        }
      });
    });
    mockIncomingForm.mockImplementation(() => ({
      parse: mockParse,
    } as MockIncomingFormInstance));

    const mockBuffer = Buffer.from('fake-image-data');
    mockFs.readFileSync.mockReturnValue(mockBuffer);

    const mockOpenAIResponse: MockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: 'Transcribed content'
          }
        }]
      })
    };
    mockFetch.mockResolvedValue(mockOpenAIResponse as Response);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());
    expect(responseData.results[0].filename).toBe('Untitled');
  });
});
