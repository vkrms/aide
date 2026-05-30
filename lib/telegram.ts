import { Bot } from 'grammy';

export type { Context } from 'grammy';

export function createBot(token: string) {
    return new Bot(token);
}

type SendMessageOptions = {
    token: string;
    chatId: string;
    text: string;
    replyToMessageId?: number;
};

export async function sendTelegramMessage({ token, chatId, text, replyToMessageId }: SendMessageOptions): Promise<void> {
    const bot = createBot(token);

    await bot.api.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        ...(replyToMessageId !== undefined && { reply_to_message_id: replyToMessageId }),
    });
}
