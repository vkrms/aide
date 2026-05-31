import { GoogleGenAI, Type, type FunctionCall } from '@google/genai';

import type { ChatMessage } from '../db/schema.js';

const MODEL = 'gemini-3.1-flash-lite';

const SYSTEM_INSTRUCTION =
    'You are an empathetic, concise, and engaging ADHD-friendly Accountability Partner. ' +
    'Your tone is supportive, energetic, completely non-judgmental, and slightly playful. ' +
    'Never write long essays or overwhelming bulleted lists of 10 tasks. ' +
    'Keep your daily check-in under 3 sentences. Focus on getting them to identify just ONE single, ' +
    'tiny, low-friction action they can do right now to move their project forward. ' +
    `The current UTC time is ${new Date().toISOString()}. When the user asks to set a reminder, ` +
    'always resolve the time they mention to a UTC ISO 8601 string before calling scheduleReminder.';

const CHECKIN_PROMPT = "Generate today's morning check-in message. Keep it short, actionable, and friendly.";
const CHECKIN_FALLBACK = "Hey there! Ready to conquer one small thing today? What's your tiny focus?";
const REPLY_FALLBACK = "I'm here! What tiny step can we tackle together right now?";

const TOOLS = [
    {
        functionDeclarations: [
            {
                name: 'scheduleReminder',
                description: 'Schedule a reminder message to be sent to the user at a specific time.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        message: {
                            type: Type.STRING,
                            description: 'The reminder message to send to the user.',
                        },
                        scheduledAt: {
                            type: Type.STRING,
                            description: 'UTC ISO 8601 datetime string for when to send the reminder.',
                        },
                    },
                    required: ['message', 'scheduledAt'],
                },
            },
        ],
    },
];

export type ScheduleReminderArgs = { message: string; scheduledAt: string };

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

export type ReplyResult =
    | { type: 'text'; text: string; updatedHistory: ChatMessage[] }
    | { type: 'scheduleReminder'; args: ScheduleReminderArgs; updatedHistory: ChatMessage[] };

export async function replyToMessage(
    apiKey: string,
    userMessage: string,
    history: ChatMessage[] = [],
): Promise<ReplyResult> {
    const ai = createClient(apiKey);

    const chat = ai.chats.create({
        model: MODEL,
        history,
        config: { systemInstruction: SYSTEM_INSTRUCTION, tools: TOOLS },
    });

    const response = await chat.sendMessage({ message: userMessage });

    const newHistory: ChatMessage[] = [
        ...history,
        { role: 'user', parts: [{ text: userMessage }] },
    ];

    const functionCall = response.functionCalls?.[0] as FunctionCall | undefined;
    if (functionCall?.name === 'scheduleReminder') {
        return {
            type: 'scheduleReminder',
            args: functionCall.args as ScheduleReminderArgs,
            updatedHistory: newHistory,
        };
    }

    const text = response.text ?? REPLY_FALLBACK;
    return {
        type: 'text',
        text,
        updatedHistory: [...newHistory, { role: 'model', parts: [{ text }] }],
    };
}
