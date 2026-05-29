import { URL } from 'url';

export default async function handler(request, response) {
  // 1. Security Check: Protect your endpoint from being manually triggered by strangers
  // Vercel automatically populates and verifies CRON_SECRET headers for system-fired cron jobs
  const authHeader = request.headers.authorization || request.headers.get?.('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return response.status(401).json({ success: false, error: 'Unauthorized call' });
  }

  // 2. Load and validate environment variables
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const initialTelegramMessage = process.env.VERCEL === '1'
    ? process.env.INITIAL_TELEGRAM_MESSAGE
    : undefined;

  if (!telegramToken || !telegramChatId) {
    console.error('Missing configuration environment variables!');
    return response.status(500).json({
      success: false,
      error: 'Server is missing Telegram configuration tokens.'
    });
  }

  if (!initialTelegramMessage && !geminiApiKey) {
    console.error('Missing Gemini API key and no initial Telegram message override was provided.');
    return response.status(500).json({
      success: false,
      error: 'Server is missing a Gemini API key.'
    });
  }

  try {
    let botMessage = initialTelegramMessage;
    let messageSource = 'initial_message';

    if (!botMessage) {
      // 3. Craft an ADHD-friendly prompt for Gemini
      const systemInstruction =
        "You are an empathetic, concise, and engaging ADHD-friendly Accountability Partner. " +
        "Your tone is supportive, energetic, completely non-judgmental, and slightly playful. " +
        "Never write long essays or overwhelming bulleted lists of 10 tasks. " +
        "Keep your daily check-in under 3 sentences. Focus on getting them to identify just ONE single, " +
        "tiny, low-friction action they can do right now to move their project forward.";

      const userPrompt = "Generate today's morning check-in message. Keep it short, actionable, and friendly.";

      console.log('Generating prompt with Gemini...');

      // Call Gemini API using a standard fetch call
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiApiKey}`;
      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] }
        })
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        throw new Error(`Gemini API Error: ${geminiResponse.status} - ${errorText}`);
      }

      const geminiData = await geminiResponse.json();
      botMessage = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Hey there! Ready to conquer one small thing today? What's your tiny focus?";
      messageSource = 'gemini';
    } else {
      console.log('Sending configured initial Telegram message...');
    }

    console.log('Sending message to Telegram...');

    // 4. Send the message to Telegram
    const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: botMessage,
        parse_mode: 'Markdown'
      })
    });

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      throw new Error(`Telegram API Error: ${telegramResponse.status} - ${errorText}`);
    }

    return response.status(200).json({
      success: true,
      message: 'Check-in successfully generated and dispatched!',
      sent_text: botMessage,
      message_source: messageSource
    });

  } catch (error) {
    console.error('Operational Error encountered:', error);
    return response.status(500).json({ success: false, error: error.message });
  }
}
