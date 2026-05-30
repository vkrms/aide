import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-2.5-flash-preview-05-20';

const SYSTEM_INSTRUCTION =
    'You are an empathetic, concise, and engaging ADHD-friendly Accountability Partner. ' +
    'Your tone is supportive, energetic, completely non-judgmental, and slightly playful. ' +
    'Never write long essays or overwhelming bulleted lists of 10 tasks. ' +
    'Keep your daily check-in under 3 sentences. Focus on getting them to identify just ONE single, ' +
    'tiny, low-friction action they can do right now to move their project forward.';

const CHECKIN_PROMPT = "Generate today's morning check-in message. Keep it short, actionable, and friendly.";
const CHECKIN_FALLBACK = "Hey there! Ready to conquer one small thing today? What's your tiny focus?";
const REPLY_FALLBACK = "I'm here! What tiny step can we tackle together right now?";

function createClient(apiKey: string) {
    return new GoogleGenAI({ apiKey });
}

export async function generateCheckinMessage(apiKey: string): Promise<string> {
    const ai = createClient(apiKey);

    const response = await ai.models.generateContent({
        model: MODEL,
        contents: CHECKIN_PROMPT,
        config: { systemInstruction: SYSTEM_INSTRUCTION },
    });

    return response.text ?? CHECKIN_FALLBACK;
}

export async function replyToMessage(apiKey: string, userMessage: string): Promise<string> {
    const ai = createClient(apiKey);

    const response = await ai.models.generateContent({
        model: MODEL,
        contents: userMessage,
        config: { systemInstruction: SYSTEM_INSTRUCTION },
    });

    return response.text ?? REPLY_FALLBACK;
}
