import type { Env } from '../orchestrator'

export async function sendEmail(
  env: Env,
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SevenNova <alerts@sevennova.ai>',
        to,
        subject,
        html,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}
