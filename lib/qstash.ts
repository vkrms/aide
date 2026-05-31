import { Client } from '@upstash/qstash';

type ScheduleReminderOptions = {
    reminderId: string;
    scheduledAt: Date;
    baseUrl: string;
};

export async function scheduleReminder({ reminderId, scheduledAt, baseUrl }: ScheduleReminderOptions): Promise<string> {
    const token = process.env.QSTASH_TOKEN;
    if (!token) throw new Error('Missing QSTASH_TOKEN');

    const client = new Client({ token });

    const delaySeconds = Math.max(0, Math.floor((scheduledAt.getTime() - Date.now()) / 1000));

    const result = await client.publishJSON({
        url: `${baseUrl}/api/send-reminder`,
        delay: delaySeconds,
        body: { reminderId },
    });

    return result.messageId;
}
