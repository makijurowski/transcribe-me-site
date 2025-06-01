import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import { Readable } from "stream";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const data: any = await new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm({ multiples: true });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });

  const uploadedFile = Array.isArray(data.files.files)
    ? data.files.files[0]
    : data.files.files;

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
