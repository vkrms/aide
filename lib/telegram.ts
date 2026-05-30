type SendMessageOptions = {
    token: string;
    chatId: string;
    text: string;
    replyToMessageId?: number;
};

export type TelegramUpdate = {
    update_id: number;
    message?: {
        message_id: number;
        from?: { id: number; is_bot: boolean; first_name: string; username?: string };
        chat: { id: number; type: string };
        text?: string;
    };
};

async function callTelegramApi(token: string, method: string, body: object): Promise<void> {
    const url = `https://api.telegram.org/bot${token}/${method}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();

        if (response.status === 400 && errorText.includes('chat not found')) {
            throw new Error(
                'Telegram chat not found. Update TELEGRAM_CHAT_ID to a chat the bot can access, and make sure you have started a direct chat with the bot or added it to the target group.'
            );
        }

        throw new Error(`Telegram API Error: ${response.status} - ${errorText}`);
    }
}

export async function sendTelegramMessage({ token, chatId, text, replyToMessageId }: SendMessageOptions): Promise<void> {
    await callTelegramApi(token, 'sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        ...(replyToMessageId !== undefined && { reply_to_message_id: replyToMessageId }),
    });
}
