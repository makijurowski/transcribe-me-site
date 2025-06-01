# TranscribeMe

TranscribeMe is a web app that transcribes handwritten notes from images using OpenAI's GPT-4.1 API. It supports JPG and PNG file formats and provides downloadable markdown-formatted transcriptions.

## Features

- Multiple image upload support
- Markdown-formatted transcriptions
- Dark/Light mode support
- Downloadable transcription results
- Built with Next.js and TypeScript

## Prerequisites

Before you begin, ensure you have:
- Node.js (v18 or higher)
- An OpenAI API key with GPT-4.1 access

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with:
```bash
OPENAI_API_KEY=your_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

- `/src/pages/api/transcribe.ts` - API endpoint for image transcription
- `/src/pages/index.tsx` - Main application page
- `/src/styles/globals.css` - Global styles and theme configuration

## Technology Stack

- Next.js 15.3
- React 19
- TypeScript
- Tailwind CSS
- OpenAI API
- Formidable (for file uploads)

## Development Notes

- The application uses the `bodyParser: false` configuration for the API route to handle file uploads
- Image files are temporarily stored and processed server-side
- Transcription results are formatted in Markdown and can be styled using Tailwind Typography

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
