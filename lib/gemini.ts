import { GoogleGenAI, type Interactions } from '@google/genai';

const MODEL = 'gemini-3.1-flash-lite-preview';

function buildSystemInstruction() {
    const now = new Date();
    const timezone = process.env.TIMEZONE ?? 'UTC';
    const localTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        dateStyle: 'full',
        timeStyle: 'short',
    }).format(now);
    return (
        'You are an empathetic, concise, and engaging ADHD-friendly Accountability Partner. ' +
        'Your tone is supportive, energetic, completely non-judgmental, and slightly playful. ' +
        'Never write long essays or overwhelming bulleted lists of 10 tasks. ' +
        'Keep your daily check-in under 3 sentences. Focus on getting them to identify just ONE single, ' +
        'tiny, low-friction action they can do right now to move their project forward. ' +
        `The current UTC time is ${now.toISOString()}. ` +
        `The user's local time is ${localTime} (${timezone}). ` +
        'When the user mentions relative times like "tomorrow" or "in 10 minutes", resolve them ' +
        'relative to the user\'s local time, then convert to UTC ISO 8601 before calling scheduleReminder. ' +
        'For explicit weekdays like Monday or Wednesday, schedule the next occurrence of that weekday in the user\'s local time unless the user clearly specifies a different week. ' +
        'Never default an explicit weekday request to today unless today is that weekday and the user clearly asked for today.' +
        'You have a persistent memory. When the user tells you a preference, fact, or anything worth remembering, ' +
        'call storeMemory. When you need context about the user, call retrieveMemories. ' +
        'When the user asks to forget something, call deleteMemory with the memory ID from a prior retrieve.'
    );
}

const CHECKIN_PROMPT = "Generate today's morning check-in message. Keep it short, actionable, and friendly.";
const CHECKIN_FALLBACK = "Hey there! Ready to conquer one small thing today? What's your tiny focus?";
const REPLY_FALLBACK = "I'm here! What tiny step can we tackle together right now?";

const TOOLS: Interactions.Tool[] = [
    {
        type: 'function',
        name: 'scheduleReminder',
        description: 'Schedule a reminder message to be sent to the user at a specific time.',
        parameters: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    description: 'The reminder message to send to the user.',
                },
                scheduledAt: {
                    type: 'string',
                    description: 'UTC ISO 8601 datetime string for when to send the reminder.',
                },
            },
            required: ['message', 'scheduledAt'],
        },
    },
    {
        type: 'function',
        name: 'storeMemory',
        description:
            'Store a fact, preference, or piece of information the user wants the bot to remember. ' +
            'Call this when the user explicitly asks to remember something, or when they share ' +
            'a personal preference or important fact worth retaining for future conversations.',
        parameters: {
            type: 'object',
            properties: {
                content: {
                    type: 'string',
                    description: 'The fact or preference to store. Write it in a clear, self-contained sentence.',
                },
            },
            required: ['content'],
        },
    },
    {
        type: 'function',
        name: 'retrieveMemories',
        description:
            'Retrieve stored facts and preferences about the user. Call this when the user asks ' +
            '"what do you remember about me?" or when you need context from past conversations ' +
            'to give a better answer.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Optional search term to filter memories. Leave empty to retrieve all.',
                },
            },
        },
    },
    {
        type: 'function',
        name: 'deleteMemory',
        description:
            'Delete a specific memory. Call this when the user asks to forget or remove something.',
        parameters: {
            type: 'object',
            properties: {
                memoryId: {
                    type: 'string',
                    description: 'The ID of the memory to delete, obtained from retrieveMemories results.',
                },
            },
            required: ['memoryId'],
        },
    },
];

export type ScheduleReminderArgs = { message: string; scheduledAt: string };
export type StoreMemoryArgs = { content: string };
export type RetrieveMemoriesArgs = { query?: string };
export type DeleteMemoryArgs = { memoryId: string };

function createClient(apiKey: string) {
    return new GoogleGenAI({ apiKey });
}

export async function generateCheckinMessage(apiKey: string): Promise<string> {
    const ai = createClient(apiKey);

    const interaction = await ai.interactions.create({
        model: MODEL,
        input: CHECKIN_PROMPT,
        system_instruction: buildSystemInstruction(),
        generation_config: { thinking_level: 'high' }, // effort
        store: false,
    });

    return interaction.output_text ?? CHECKIN_FALLBACK;
}

export type ReplyResult =
    | { type: 'text'; text: string; interactionId: string }
    | { type: 'scheduleReminder'; args: ScheduleReminderArgs; interactionId: string }
    | { type: 'storeMemory'; args: StoreMemoryArgs; interactionId: string }
    | { type: 'retrieveMemories'; args: RetrieveMemoriesArgs; interactionId: string }
    | { type: 'deleteMemory'; args: DeleteMemoryArgs; interactionId: string };

export async function replyToMessage(
    apiKey: string,
    userMessage: string,
    previousInteractionId?: string | null,
): Promise<ReplyResult> {
    const ai = createClient(apiKey);

    const interaction = await ai.interactions.create({
        model: MODEL,
        input: userMessage,
        system_instruction: buildSystemInstruction(),
        tools: TOOLS,
        ...(previousInteractionId ? { previous_interaction_id: previousInteractionId } : {}),
    });

    const functionCallStep = interaction.steps?.find(
        (s): s is Interactions.FunctionCallStep => s.type === 'function_call',
    );

    if (functionCallStep?.name === 'scheduleReminder') {
        return {
            type: 'scheduleReminder',
            args: functionCallStep.arguments as ScheduleReminderArgs,
            interactionId: interaction.id,
        };
    }

    if (functionCallStep?.name === 'storeMemory') {
        return {
            type: 'storeMemory',
            args: functionCallStep.arguments as StoreMemoryArgs,
            interactionId: interaction.id,
        };
    }

    if (functionCallStep?.name === 'retrieveMemories') {
        return {
            type: 'retrieveMemories',
            args: functionCallStep.arguments as RetrieveMemoriesArgs,
            interactionId: interaction.id,
        };
    }

    if (functionCallStep?.name === 'deleteMemory') {
        return {
            type: 'deleteMemory',
            args: functionCallStep.arguments as DeleteMemoryArgs,
            interactionId: interaction.id,
        };
    }

    return {
        type: 'text',
        text: interaction.output_text ?? REPLY_FALLBACK,
        interactionId: interaction.id,
    };
}

export async function continueWithFunctionResponse(
    apiKey: string,
    previousInteractionId: string,
    functionName: string,
    functionResponse: Record<string, unknown>,
): Promise<{ text: string; interactionId: string }> {
    const ai = createClient(apiKey);

    const memories = functionResponse.memories as string;

    const interaction = await ai.interactions.create({
        model: MODEL,
        input:
            functionName === 'retrieveMemories'
                ? `Here is what I found in the user's stored memories:\n\n${memories}\n\nRespond to the user naturally based on this information.`
                : `Function ${functionName} result: ${JSON.stringify(functionResponse)}`,
        system_instruction: buildSystemInstruction(),
        tools: TOOLS,
        previous_interaction_id: previousInteractionId,
    });

    return {
        text: interaction.output_text ?? REPLY_FALLBACK,
        interactionId: interaction.id,
    };
}
