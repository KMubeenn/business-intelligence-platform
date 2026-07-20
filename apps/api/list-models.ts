import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

async function checkModels() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const models = await ai.models.list();
    console.log("Available Models:");
    for await (const m of models) {
      console.log(`- ${m.name}`);
    }
  } catch (err) {
    console.error("Error fetching models:", err);
  }
}

checkModels();
