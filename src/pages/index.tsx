import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid'

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [outputs, setOutputs] = useState<Array<{ filename: string; text: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadText = (filename: string, text: string) => {
    const element = document.createElement('a');
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${filename.replace(/\.[^/.]+$/, '')}_transcription.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setLoading(true);
    setError(null);
    setOutputs([]);

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Unknown error");

      setOutputs(data.results);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center">📝 TranscribeMe</h1>
        <div className="flex justify-center text-sm text-gray-500 italic">
            Supports .jpg or .png files
        </div>
        <div className="space-y-4">
  <div className="grid grid-cols-2 gap-6">
    <div className="space-y-4">
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
        className="block w-full text-sm text-gray-600
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
      />
      <button
        onClick={handleUpload}
        disabled={loading}
        className={`px-4 py-2 rounded text-white font-medium ${
          loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "Transcribing..." : "Transcribe"}
      </button>
    </div>
    
    <div>
      {files.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-1">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Files:</h3>
          <ul className="text-sm text-gray-500 space-y-1">
            {files.map((file, idx) => (
              <li key={idx}>📎 {file.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  </div>

  {error && <p className="text-red-600">⚠️ {error}</p>}
</div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">🧾 Transcription Preview</h2>
          {outputs.length > 0 ? (
            <div className="space-y-8">
              {outputs.map((output, index) => (
                <div key={index} className="border-t pt-4 first:border-t-0 first:pt-0 relative">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-gray-500 font-semibold">{output.filename}</h3>
                    <button
                      onClick={() => downloadText(output.filename, output.text)}
                      className="text-gray-500 hover:text-gray-700 transition-colors p-2"
                      title="Download transcription"
                    >
                      <ArrowDownTrayIcon className="size-4" />
                    </button>
                  </div>
                  <div className="prose prose-lg prose-slate max-w-none">
                    <ReactMarkdown 
                      components={{
                        h1: ({...props}) => <h3 className="text-lg font-semibold mb-3" {...props} />,
                        h2: ({...props}) => <h4 className="text-base font-semibold mb-2" {...props} />,
                        h3: ({...props}) => <h5 className="text-sm font-medium mb-2" {...props} />,
                        h4: ({...props}) => <h6 className="text-sm font-medium mb-2" {...props} />,
                        h5: ({...props}) => <h6 className="text-xs font-medium mb-1" {...props} />,
                        h6: ({...props}) => <h6 className="text-xs font-medium mb-1" {...props} />,
                        p: ({...props}) => <p className="text-base mb-3" {...props} />,
                        ul: ({...props}) => <ul className="list-disc pl-4 mb-3" {...props} />,
                        ol: ({...props}) => <ol className="list-decimal pl-4 mb-3" {...props} />,
                        li: ({...props}) => <li className="mb-1" {...props} />,
                      }}
                    >
                      {output.text}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No output yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
