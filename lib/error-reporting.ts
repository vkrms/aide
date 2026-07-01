import { sendTelegramMessage } from './telegram';

/**
 * Fire-and-forget: forwards a concise error summary to a Telegram chat.
 * Silently swallows its own failures so it never compounds an outage.
 */
export function reportErrorTelegram(label: string, error: unknown): void {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.ERROR_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) return;

    const message = error instanceof Error ? error.message : String(error ?? 'unknown');
    const truncated = message.length > 300 ? message.slice(0, 300) + '…' : message;

    const text = [
        `⚠️ *${escapeTelegram(label)}*`,
        '',
        '```',
        truncated,
        '```',
    ].join('\n');

    sendTelegramMessage({ token, chatId, text }).catch(() => {
        // intentionally silent — don't compound a failure with another failure
    });
}

function escapeTelegram(value: string): string {
    return value.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('`', '\\`');
}
