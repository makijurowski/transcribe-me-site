import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [outputs, setOutputs] = useState<Array<{ filename: string; text: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
       {files.length > 0 && (
            <ul className="text-sm text-gray-500">
              {files.map((file, idx) => (
                <li key={idx}>📎 {file.name}</li>
              ))}
            </ul>
          )}
          <button
            onClick={handleUpload}
            disabled={loading}
            className={`px-4 py-2 rounded text-white font-medium ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Transcribing..." : "Transcribe"}
          </button>

          {error && <p className="text-red-600">⚠️ {error}</p>}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">🧾 Transcription Preview</h2>
          {outputs.length > 0 ? (
            <div className="space-y-8">
              {outputs.map((output, index) => (
                <div key={index} className="border-t pt-4 first:border-t-0 first:pt-0">
                  <h3 className="text-lg font-medium mb-2">📄 {output.filename}</h3>
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
