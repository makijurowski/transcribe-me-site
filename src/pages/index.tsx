import { useState } from "react";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [output, setOutput] = useState<string>("");

  const handleUpload = async () => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setOutput(data.text || "No transcription returned");
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">📝 GPT Transcriber</h1>
      
      <input
        type="file"
        multiple
        accept="image/*,.pdf"
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
        className="mb-4"
      />

      <button
        onClick={handleUpload}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Transcribe
      </button>

      <div className="mt-6">
        <h2 className="font-semibold text-lg">Transcription Output:</h2>
        <pre className="bg-white p-4 rounded shadow mt-2 whitespace-pre-wrap">
          {output}
        </pre>
      </div>
    </div>
  );
}
