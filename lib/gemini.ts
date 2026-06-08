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
        'For explicit weekdays like Monday or Wednesday, schedule the next occurrence of that weekday in the user\'s local time unless the user clearly specifies a different week. '
        + 'Never default an explicit weekday request to today unless today is that weekday and the user clearly asked for today.'
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
];

export type ScheduleReminderArgs = { message: string; scheduledAt: string };

function createClient(apiKey: string) {
    return new GoogleGenAI({ apiKey });
}

export async function generateCheckinMessage(apiKey: string): Promise<string> {
    const ai = createClient(apiKey);

    const interaction = await ai.interactions.create({
        model: MODEL,
        input: CHECKIN_PROMPT,
        system_instruction: buildSystemInstruction(),
        generation_config: { thinking_level: 'low' },
        store: false,
    });

    return interaction.output_text ?? CHECKIN_FALLBACK;
}

export type ReplyResult =
    | { type: 'text'; text: string; interactionId: string }
    | { type: 'scheduleReminder'; args: ScheduleReminderArgs; interactionId: string };

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

    return {
        type: 'text',
        text: interaction.output_text ?? REPLY_FALLBACK,
        interactionId: interaction.id,
    };
}
