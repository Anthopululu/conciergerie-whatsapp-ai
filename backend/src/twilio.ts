import twilio from 'twilio';

// Store multiple Twilio clients - one per conciergerie
export const twilioClients: Map<number, ReturnType<typeof twilio>> = new Map();
const twilioNumbers: Map<number, string> = new Map();

export function initTwilio() {
  // Global Twilio setup is now handled per-conciergerie
  // This function can remain empty or be used for default client
  console.log('Twilio multi-client mode initialized');
}

export function initTwilioForConciergerie(conciergerieId: number, accountSid: string, authToken: string, whatsappNumber: string) {
  try {
    const client = twilio(accountSid, authToken);
    twilioClients.set(conciergerieId, client);
    twilioNumbers.set(conciergerieId, whatsappNumber);
    console.log(`✅ Twilio initialized for conciergerie ${conciergerieId}: ${whatsappNumber}`);
  } catch (error) {
    console.error(`❌ Failed to initialize Twilio for conciergerie ${conciergerieId}:`, error);
    throw error;
  }
}

export async function sendWhatsAppMessage(to: string, message: string, conciergerieId?: number, fromNumber?: string): Promise<void> {
  try {
    // Normalize phone number format: ensure whatsapp: prefix and + sign
    // Handle cases like "whatsapp: 336..." or "whatsapp:336..." -> "whatsapp:+336..."
    let formattedTo = to.trim();
    if (!formattedTo.startsWith('whatsapp:')) {
      formattedTo = `whatsapp:${formattedTo}`;
    }
    // Ensure + sign after whatsapp: prefix (but avoid double ++)
    formattedTo = formattedTo.replace(/^whatsapp:\s*/, 'whatsapp:').replace(/^whatsapp:([^+])/, 'whatsapp:+$1').replace(/^whatsapp:\+\+/, 'whatsapp:+');

    console.log(`📤 sendWhatsAppMessage called: to=${formattedTo}, conciergerieId=${conciergerieId}, fromNumber=${fromNumber}`);

    // Use specific conciergerie client if provided
    if (conciergerieId && twilioClients.has(conciergerieId)) {
      const client = twilioClients.get(conciergerieId)!;
      const from = fromNumber || twilioNumbers.get(conciergerieId);

      console.log(`🔍 Using conciergerie client: conciergerieId=${conciergerieId}, from=${from}, client exists=${!!client}`);

      if (!from) {
        throw new Error(`WhatsApp number not configured for conciergerie ${conciergerieId}. Please configure it in the admin panel.`);
      }

      console.log(`📨 Attempting to send: from=${from}, to=${formattedTo}, message length=${message.length}`);
      
      const result = await client.messages.create({
        from: from,
        to: formattedTo,
        body: message,
      });

      console.log(`✅ Message sent successfully! SID: ${result.sid}, Status: ${result.status}`);
      console.log(`✅ Message sent from ${from} to ${formattedTo} (conciergerie ${conciergerieId})`);
    } else {
      // Fallback to default Twilio from env vars (backward compatibility)
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

      if (!accountSid || !authToken || !whatsappNumber) {
        throw new Error('No Twilio client configured for this conciergerie and no default credentials found');
      }

      const defaultClient = twilio(accountSid, authToken);
      await defaultClient.messages.create({
        from: whatsappNumber,
        to: formattedTo,
        body: message,
      });

      console.log(`✅ Message sent from ${whatsappNumber} to ${formattedTo} (default client)`);
    }
  } catch (error: any) {
    console.error('❌ Twilio error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo,
      stack: error.stack
    });
    throw error;
  }
}

export function validateTwilioRequest(signature: string, url: string, params: any, authToken?: string): boolean {
  const token = authToken || process.env.TWILIO_AUTH_TOKEN || '';
  return twilio.validateRequest(token, signature, url, params);
}
