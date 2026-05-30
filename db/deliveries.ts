import { deliveries } from './schema.js';
import { getDb } from './client.js';

type DeliveryStatus = 'sent' | 'failed';

type RecordDeliveryInput = {
    message: string;
    messageSource: string;
    status: DeliveryStatus;
    telegramChatId: string;
    cronSchedule?: string;
    errorMessage?: string;
};

export async function recordDelivery(input: RecordDeliveryInput) {
    const db = getDb();

    if (!db) {
        return false;
    }

    try {
        await db.insert(deliveries).values(input);
        return true;
    } catch (error) {
        console.error('Failed to persist delivery record:', error);
        return false;
    }
}
