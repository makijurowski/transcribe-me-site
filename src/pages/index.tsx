import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (files.length === 0) return;

    setLoading(true);
    setError(null);
    setOutput("");

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Unknown error");

      setOutput(data.text || "No transcription returned.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center">📝 TranscibeMe</h1>

        <div className="space-y-4">
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
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

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold">🧾 Transcription Preview</h2>
          {output ? (
            <div className="prose max-w-none prose-blue">
              <ReactMarkdown>{output}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-gray-500 italic">No output yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
