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
  const uploadedFile = Array.isArray(uploaded) ? uploaded[0] : uploaded;
  
  if (!uploadedFile || !uploadedFile.filepath) {
    return res.status(400).json({ error: "No valid file uploaded." });
  }
  
  const buffer = fs.readFileSync(uploadedFile.filepath);
  const base64Image = buffer.toString("base64");

  const imagePayload = `data:${uploadedFile.mimetype};base64,${base64Image}`;

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please transcribe this handwritten note. If it looks like a list or journal, format it with Markdown.",
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

  const json = await openaiRes.json();
  const text = json.choices?.[0]?.message?.content;

  res.status(200).json({ text });
}
