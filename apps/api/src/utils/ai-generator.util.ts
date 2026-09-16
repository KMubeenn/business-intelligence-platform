import { Logger } from '@nestjs/common';
import OpenAI from 'openai';

const logger = new Logger('AiGeneratorUtil');

// Initialize OpenAI client pointed at local OmniRoute instance
// OmniRoute acts as a universal proxy for 250+ providers
const omniRouteClient = new OpenAI({
  apiKey: 'dummy', // OmniRoute doesn't require an API key for local usage
  baseURL: process.env.OMNIROUTE_URL || 'http://localhost:20128/v1',
  timeout: 120000 // 2 minutes timeout, OmniRoute will handle internal fast-failing
});

export async function generateWithFallbacks(prompt: string, isJson: boolean = false): Promise<string> {
  try {
    logger.log(`Sending request to OmniRoute (model: auto/cheap) - JSON Mode: ${isJson}`);

    const requestOptions: any = {
      // Using auto ensures OmniRoute routes to the best available provider
      model: 'free-stack',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      // Pass the structure down. OmniRoute translates this for Claude, Gemini, etc.
      ...(isJson && { response_format: { type: 'json_object' } })
    };

    const completion = await omniRouteClient.chat.completions.create(requestOptions);

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error('OmniRoute returned an empty response content.');
    }

    return responseContent;
  } catch (error: any) {
    logger.error(`OmniRoute generation failed: ${error.message}`);
    throw new Error(`AI generation failed via OmniRoute: ${error.message}`);
  }
}
