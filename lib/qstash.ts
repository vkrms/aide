import { Client } from '@upstash/qstash';

/** QStash free-tier max delay: 7 days in seconds */
const MAX_DELAY_SECONDS = 604800;

type ScheduleReminderOptions = {
    reminderId: string;
    telegramChatId: string;
    scheduledAt: Date;
    baseUrl: string;
};

export async function scheduleReminder({ reminderId, telegramChatId, scheduledAt, baseUrl }: ScheduleReminderOptions): Promise<string> {
    const token = process.env.QSTASH_TOKEN;
    if (!token) throw new Error('Missing QSTASH_TOKEN');

    const client = new Client({ token });

    const totalDelaySeconds = Math.max(0, Math.floor((scheduledAt.getTime() - Date.now()) / 1000));
    const bypassHeader = process.env.VERCEL_BYPASS_TOKEN ?? '';

    // When the delay fits within QStash's cap, schedule the actual reminder delivery.
    if (totalDelaySeconds <= MAX_DELAY_SECONDS) {
        const result = await client.publishJSON({
            url: `${baseUrl}/api/send-reminder`,
            delay: totalDelaySeconds,
            body: { reminderId, telegramChatId },
            headers: { 'x-vercel-protection-bypass': bypassHeader },
        });
        return result.messageId;
    }

    // Delay exceeds the cap — chain through an intermediate endpoint that will
    // re-invoke scheduleReminder after MAX_DELAY_SECONDS with the same params.
    const result = await client.publishJSON({
        url: `${baseUrl}/api/schedule-next`,
        delay: MAX_DELAY_SECONDS,
        body: { reminderId, telegramChatId, scheduledAt: scheduledAt.toISOString() },
        headers: { 'x-vercel-protection-bypass': bypassHeader },
    });

    return result.messageId;
}
