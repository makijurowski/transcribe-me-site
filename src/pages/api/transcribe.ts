import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, Fields, Files } from "formidable";
import fs from "fs";
// import { Readable } from "stream";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const data: { fields: Fields; files: Files } = await new Promise((resolve, reject) => {
    const form = new IncomingForm({ multiples: true, keepExtensions: true });
  
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

  const uploaded = data.files?.files;
  const uploadedFiles = Array.isArray(uploaded) ? uploaded : [uploaded];
  
  if (!uploadedFiles.length || !uploadedFiles[0]?.filepath) {
    return res.status(400).json({ error: "No valid files uploaded." });
  }

  const results = await Promise.all(
    uploadedFiles.filter((file): file is NonNullable<typeof file> => file !== undefined)
      .map(async (file) => {
        try {
          if (!file.filepath) {
            throw new Error("No filepath found for file");
          }
          const buffer = fs.readFileSync(file.filepath);
          const base64Image = buffer.toString("base64");
          const imagePayload = `data:${file.mimetype};base64,${base64Image}`;

          const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4.1",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Please transcribe this handwritten note and use Markdown formatting. Please don't include any other text, and make sure to designate any date or title.",
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: imagePayload,
                      },
                    },
                  ],
                },
              ],
              max_tokens: 2000,
            }),
          });

          if (!openaiRes.ok) {
            const errorData = await openaiRes.text();
            console.error('OpenAI Error:', errorData);
            throw new Error(`OpenAI API error: ${openaiRes.status}`);
          }

          const json = await openaiRes.json();
          if (!json.choices?.[0]?.message?.content) {
            throw new Error("No transcription received from OpenAI");
          }

          return {
            filename: file.originalFilename || 'Untitled',
            text: json.choices[0].message.content
          };
        } catch (error) {
          console.error(`Error processing file ${file.originalFilename}:`, error);
          return {
            filename: file.originalFilename || 'Untitled',
            text: `Error: Failed to transcribe this file. ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      })
  );

  return res.status(200).json({ results });
}
