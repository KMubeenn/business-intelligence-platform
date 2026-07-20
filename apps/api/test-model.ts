import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

async function testModel(modelName: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: "Say hello",
    });
    console.log(`[${modelName}] Success: ${response.text}`);
  } catch (err: any) {
    console.error(`[${modelName}] Failed: ${err.message}`);
  }
}

async function runTests() {
  await testModel('gemini-2.0-flash-lite');
  await testModel('gemini-flash-latest');
  await testModel('gemini-3.5-flash');
}

runTests();
