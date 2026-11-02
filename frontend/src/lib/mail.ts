export const sendMail = async (to: string, subject: string, html: string, attachments?: string[]) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY is missing in environment variables.");
    }

    const senderEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@onrivi.com';
    const senderName = process.env.SMTP_FROM_NAME || 'Onrivi 고객지원';

    let brevoAttachments;
    if (attachments && attachments.length > 0) {
      brevoAttachments = attachments.map(url => {
        const nameMatch = url.match(/name=([^&]+)/);
        const name = nameMatch ? decodeURIComponent(nameMatch[1]) : url.split('/').pop() || 'attachment';
        return { url, name };
      });
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html,
        ...(brevoAttachments && { attachment: brevoAttachments })
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Brevo API Error: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    console.log('Message sent via Brevo API: %s', data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('Error sending email via Brevo API:', error);
    return { success: false, error };
  }
};
