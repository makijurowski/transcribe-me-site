import { createMocks } from 'node-mocks-http'
import handler from '../transcribe'
import { IncomingForm } from 'formidable'
import fs from 'fs'

// Mock dependencies
jest.mock('formidable')
jest.mock('fs')
jest.mock('process', () => ({
  env: {
    OPENAI_API_KEY: 'test-api-key'
  }
}))

const mockIncomingForm = IncomingForm as jest.MockedClass<typeof IncomingForm>
const mockFs = fs as jest.Mocked<typeof fs>

// Mock fetch globally
global.fetch = jest.fn()

describe('/api/transcribe', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
  })

  it('should return 400 when no files are uploaded', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    })

    const mockParse = jest.fn((req, callback) => {
      callback(null, {}, { files: [] })
    })

    mockIncomingForm.mockImplementation(() => ({
      parse: mockParse,
    } as any))

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    expect(JSON.parse(res._getData())).toEqual({
      error: 'No valid files uploaded.'
    })
  })

  it('should successfully transcribe a file', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    })

    const mockFile = {
      filepath: '/tmp/test-file.jpg',
      originalFilename: 'test.jpg',
      mimetype: 'image/jpeg'
    }

    const mockParse = jest.fn((req, callback) => {
      callback(null, {}, { files: [mockFile] })
    })

    mockIncomingForm.mockImplementation(() => ({
      parse: mockParse,
    } as any))

    mockFs.readFileSync.mockReturnValue(Buffer.from('fake-image-data'))

    const mockOpenAIResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: '# Test Transcription\n\nThis is a test transcription.'
          }
        }]
      })
    }

    ;(global.fetch as jest.Mock).mockResolvedValue(mockOpenAIResponse)

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    expect(responseData.results).toHaveLength(1)
    expect(responseData.results[0]).toEqual({
      filename: 'test.jpg',
      text: '# Test Transcription\n\nThis is a test transcription.'
    })
  })

  it('should handle OpenAI API errors', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    })

    const mockFile = {
      filepath: '/tmp/test-file.jpg',
      originalFilename: 'test.jpg',
      mimetype: 'image/jpeg'
    }

    const mockParse = jest.fn((req, callback) => {
      callback(null, {}, { files: [mockFile] })
    })

    mockIncomingForm.mockImplementation(() => ({
      parse: mockParse,
    } as any))

    mockFs.readFileSync.mockReturnValue(Buffer.from('fake-image-data'))

    const mockOpenAIResponse = {
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue('Bad Request')
    }

    ;(global.fetch as jest.Mock).mockResolvedValue(mockOpenAIResponse)

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    expect(responseData.results[0].text).toContain('Error: Failed to transcribe this file')
  })

  it('should handle multiple files', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    })

    const mockFiles = [
      {
        filepath: '/tmp/test-file1.jpg',
        originalFilename: 'test1.jpg',
        mimetype: 'image/jpeg'
      },
      {
        filepath: '/tmp/test-file2.jpg',
        originalFilename: 'test2.jpg',
        mimetype: 'image/jpeg'
      }
    ]

    const mockParse = jest.fn((req, callback) => {
      callback(null, {}, { files: mockFiles })
    })

    mockIncomingForm.mockImplementation(() => ({
      parse: mockParse,
    } as any))

    mockFs.readFileSync.mockReturnValue(Buffer.from('fake-image-data'))

    const mockOpenAIResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: 'Test transcription'
          }
        }]
      })
    }

    ;(global.fetch as jest.Mock).mockResolvedValue(mockOpenAIResponse)

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    expect(responseData.results).toHaveLength(2)
  })
}) 