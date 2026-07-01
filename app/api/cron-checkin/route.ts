import { NextRequest, NextResponse } from 'next/server';

import { recordDelivery } from '@/db/deliveries';
import { reportErrorTelegram } from '@/lib/error-reporting';
import { generateCheckinMessage } from '@/lib/gemini';
import { sendTelegramMessage } from '@/lib/telegram';

const forcedTelegramMessage = 'I want to help you organize your stuff a little bit';

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error';
}

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSchedule = request.headers.get('x-vercel-cron-schedule');

    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized call' }, { status: 401 });
    }

    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const initialTelegramMessage = process.env.VERCEL === '1' ? process.env.INITIAL_TELEGRAM_MESSAGE : undefined;

    if (!telegramToken || !telegramChatId) {
        console.error('Missing configuration environment variables!');
        return NextResponse.json({ success: false, error: 'Server is missing Telegram configuration tokens.' }, { status: 500 });
    }

    if (!forcedTelegramMessage && !initialTelegramMessage && !geminiApiKey) {
        console.error('Missing Gemini API key and no initial Telegram message override was provided.');
        return NextResponse.json({ success: false, error: 'Server is missing a Gemini API key.' }, { status: 500 });
    }

    let botMessage = forcedTelegramMessage || initialTelegramMessage || '';
    let messageSource = forcedTelegramMessage ? 'hardcoded' : 'initial_message';

    try {
        if (!botMessage) {
            console.log('Generating prompt with Gemini...');
            botMessage = await generateCheckinMessage(geminiApiKey!);
            messageSource = 'gemini';
        } else {
            console.log(`Sending ${forcedTelegramMessage ? 'hardcoded' : 'configured initial'} Telegram message...`);
        }

        console.log('Sending message to Telegram...');
        await sendTelegramMessage({ token: telegramToken, chatId: telegramChatId, text: botMessage });

        await recordDelivery({ message: botMessage, messageSource, status: 'sent', telegramChatId, cronSchedule: cronSchedule ?? undefined });

        return NextResponse.json({
            success: true,
            message: 'Check-in successfully generated and dispatched!',
            sent_text: botMessage,
            message_source: messageSource,
        });
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        const isBillingIssue = errorMessage.includes('dunning') || errorMessage.includes('PERMISSION_DENIED');

        console.error('Operational Error encountered:', error);
        reportErrorTelegram('Cron check-in failed', error);

        if (isBillingIssue && telegramToken && telegramChatId) {
            await sendTelegramMessage({
                token: telegramToken,
                chatId: telegramChatId,
                text: 'My brain is taking a quick break — there is a billing hiccup with the AI provider. Check-ins will resume once it is resolved.',
            }).catch(() => {});
        }

        await recordDelivery({
            message: botMessage || 'Unavailable message',
            messageSource,
            status: 'failed',
            telegramChatId,
            cronSchedule: cronSchedule ?? undefined,
            errorMessage,
        });

        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
