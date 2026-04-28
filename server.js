const express = require('express');
const app = express();

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.post('/score', async (req, res) => {
  try {
    const formData = req.body;

    // Log lead
    console.log('NEW SCAN AUDIT LEAD:', {
      name: formData.name,
      email: formData.email,
      timestamp: new Date().toISOString(),
      niche: formData.q1,
    });

    // Send email via Resend
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Booked Scan <onboarding@resend.dev>',
          to: 'boldcapetown@gmail.com',
          subject: `New SCAN Audit — ${formData.name || 'Unknown'}`,
          html: `
            <div style="font-family: helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0e0a1a; color: #f0ede8;">
              <h2 style="color: #C8A96E; font-size: 24px; margin-bottom: 4px;">New SCAN Audit Submission</h2>
              <p style="color: #9a9a9a; font-size: 12px; margin-top: 0;">${new Date().toISOString()}</p>
              <hr style="border: none; border-top: 1px solid rgba(200,169,110,0.2); margin: 24px 0;" />
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #9a9a9a; font-size: 12px; width: 140px;">NAME</td><td style="padding: 8px 0; color: #f0ede8;">${formData.name || '—'}</td></tr>
                <tr><td style="padding: 8px 0; color: #9a9a9a; font-size: 12px;">EMAIL</td><td style="padding: 8px 0; color: #f0ede8;">${formData.email || '—'}</td></tr>
                <tr><td style="padding: 8px 0; color: #9a9a9a; font-size: 12px;">NICHE</td><td style="padding: 8px 0; color: #f0ede8;">${formData.q1 || '—'}</td></tr>
                <tr><td style="padding: 8px 0; color: #9a9a9a; font-size: 12px;">IDEAL CLIENT</td><td style="padding: 8px 0; color: #f0ede8;">${formData.q2 || '—'}</td></tr>
                <tr><td style="padding: 8px 0; color: #9a9a9a; font-size: 12px;">WEBSITE</td><td style="padding: 8px 0; color: #f0ede8;">${formData.q3_url || formData.q3 || '—'}</td></tr>
                <tr><td style="padding: 8px 0; color: #9a9a9a; font-size: 12px;">PLATFORMS</td><td style="padding: 8px 0; color: #f0ede8;">${(formData.platforms || []).join(', ') || '—'}</td></tr>
                <tr><td style="padding: 8px 0; color: #9a9a9a; font-size: 12px;">GOOGLE RESULT</td><td style="padding: 8px 0; color: #f0ede8;">${formData.q6 || '—'}</td></tr>
                <tr><td style="padding: 8px 0; color: #9a9a9a; font-size: 12px;">DISCOVERY</td><td style="padding: 8px 0; color: #f0ede8;">${formData.q8 || '—'}</td></tr>
              </table>
              <hr style="border: none; border-top: 1px solid rgba(200,169,110,0.2); margin: 24px 0;" />
              <p style="color: #9a9a9a; font-size: 11px; text-align: center;">Booked · SCAN Audit</p>
            </div>
          `,
        }),
      });
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);
    }

    // Call OpenAI
    const prompt = `You are an expert digital presence auditor for fashion creatives. Analyze the following self-reported information and produce a structured JSON audit.

CONTEXT:
You are scoring this fashion creative on TWO pillars only:
1. AI Discoverability (1-10) — how findable they are by AI systems like ChatGPT, Perplexity, Google AI Overviews, Claude
2. Digital Visibility (1-10) — how findable they are through traditional search and discovery (Google, social, directories)

CREATIVE'S RESPONSES:
- Niche: ${formData.q1 || 'Not specified'}
- Specific work type: ${formData.q1b || 'Not specified'}
- Ideal client: ${formData.q2 || 'Not specified'}
- How clients typically find creatives like them: ${formData.q2b || 'Not specified'}
- Has website: ${formData.q3 || 'Not specified'}
- Website URL: ${formData.q3_url || 'None provided'}
- Site ease-of-hire: ${formData.q3b || 'Not specified'}
- Active platforms: ${(formData.platforms || []).join(', ') || 'None'}
- Instagram bio: ${formData.q5 || 'Not specified'}
- Google name result: ${formData.q6 || 'Not specified'}
- Ranks for niche+location: ${formData.q6b || 'Not specified'}
- Industry directories: ${formData.q7 || 'Not specified'}
- Main discovery channel: ${formData.q8 || 'Not specified'}
- Mentioned in AI tools when searched: ${formData.q9 || 'Not specified'}
- Name consistency across platforms: ${formData.q10 || 'Not specified'}
- External content (press, features, mentions): ${formData.q11 || 'Not specified'}

INSTRUCTIONS:
1. Score each pillar 1-10 based on the responses. Be honest — a 6 is a 6, not an 8.
2. Write a 2-3 sentence description for each pillar explaining WHY they got that score, specific to their answers.
3. Identify 3-4 specific blockers based on their actual responses (not generic advice).
4. Suggest ONE quick win they can do this week — concrete and specific to their situation.
5. Give an overall standing: "At risk" (total 0-8), "Functional" (9-14), or "Solid" (15-20).

OUTPUT FORMAT (strict JSON only, no markdown, no preamble):
{
  "ai_score": <number 1-10>,
  "ai_description": "<2-3 sentence explanation>",
  "vis_score": <number 1-10>,
  "vis_description": "<2-3 sentence explanation>",
  "blockers": [
    {"title": "<short title>", "body": "<1-2 sentence explanation>"},
    {"title": "<short title>", "body": "<1-2 sentence explanation>"},
    {"title": "<short title>", "body": "<1-2 sentence explanation>"}
  ],
  "quick_win": {
    "title": "<one-line action>",
    "body": "<1-2 sentence why and how>"
  },
  "standing": {
    "title": "<At risk | Functional | Solid>",
    "body": "<2-3 sentence summary>"
  }
}

Tone: Direct, professional, industry-fluent. No hype. No corporate language. Speak like someone with 10 years inside fashion.`;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a fashion industry digital presence expert. Always return valid JSON only — no markdown, no code blocks, no preamble.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI error:', errText);
      return res.status(500).json({ error: 'OpenAI API error' });
    }

    const data = await openaiRes.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    res.json(parsed);

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Score server running on port ${PORT}`));
