import twilio from 'twilio';

let client: ReturnType<typeof twilio>;
let authToken: string;
let whatsappNumber: string;

export function initTwilio() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  authToken = process.env.TWILIO_AUTH_TOKEN!;
  whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER!;

  if (!accountSid || !authToken || !whatsappNumber) {
    throw new Error('Missing Twilio credentials in environment variables');
  }

  client = twilio(accountSid, authToken);
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  try {
    // Ensure phone number has whatsapp: prefix
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    await client.messages.create({
      from: whatsappNumber,
      to: formattedTo,
      body: message,
    });

    console.log(`Message sent to ${formattedTo}`);
  } catch (error) {
    console.error('Twilio error:', error);
    throw error;
  }
}

export function validateTwilioRequest(signature: string, url: string, params: any): boolean {
  return twilio.validateRequest(authToken, signature, url, params);
}
