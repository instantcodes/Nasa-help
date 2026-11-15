import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '2mb' }));

const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleGeminiError(err: unknown, res: express.Response) {
  const message = err instanceof Error ? err.message : String(err);
  if (message === 'MISSING_API_KEY') {
    return res.status(503).json({
      error: 'Gemini API key is not set. Add it in Settings > Secrets to use AI tools.',
    });
  }
  if (message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID')) {
    return res.status(401).json({
      error: 'Gemini API key was rejected. Check your key in Settings > Secrets.',
    });
  }
  if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
    return res.status(429).json({
      error: 'AI quota limit reached right now. Wait a moment and try again.',
    });
  }
  console.error('Gemini API error:', err);
  return res.status(500).json({
    error: 'Could not reach the AI service right now. Try again in a moment.',
  });
}

// 1. Ask My Health Coach
app.post('/api/ai/coach', async (req, res) => {
  try {
    const { question, day, systems, last7Days, history } = req.body as {
      question: string;
      day: number;
      systems: unknown;
      last7Days: unknown;
      history?: Array<{ role: 'user' | 'assistant'; text: string }>;
    };

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Please enter a question.' });
    }

    const ai = getGeminiClient();

    const conversationContext = (history ?? [])
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Astronaut' : 'Coach'}: ${m.text}`)
      .join('\n');

    const prompt = [
      `Current Mission Day: Day ${day} of 90.`,
      `Current System Statuses:\n${JSON.stringify(systems, null, 2)}`,
      `Last 7 Days of Indicator Values & Drift Scores:\n${JSON.stringify(last7Days, null, 2)}`,
      conversationContext ? `Recent conversation:\n${conversationContext}` : '',
      `Astronaut question: "${question.trim()}"`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction:
          'You are a calm, practical health coach for an astronaut on a 90-day space mission. Use plain, everyday English with zero medical jargon. Reference their actual numbers and drift scores from the context provided. Keep your answer under 160 words: give a short plain-English explanation followed by 2 to 3 clear, numbered next steps they can do today.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    return res.json({ answer: (response.text ?? '').trim() });
  } catch (err) {
    return handleGeminiError(err, res);
  }
});

// 2. Analyze My Data (full 90-day trends + drift scores)
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { selectedDay, baseline, full90Days } = req.body as {
      selectedDay: number;
      baseline: unknown;
      full90Days: unknown;
    };

    const ai = getGeminiClient();

    const prompt = [
      `Currently viewing Mission Day ${selectedDay} of 90.`,
      `Personal 14-Day Baseline (avg and spread):\n${JSON.stringify(baseline, null, 2)}`,
      `Full 90-Day Indicator Values & Drift Scores:\n${JSON.stringify(full90Days)}`,
      `Analyze the full 90-day mission dataset and clearly explain:
1. What changed (key shifts across the mission)
2. When each change started (exact day ranges)
3. Which body systems are linked together
4. What is likely to turn Red next if current trends continue`,
    ].join('\n\n');

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction:
          'You are analyzing 90 days of astronaut health telemetry in plain English (no medical jargon). Be concise and structured. Use exactly 4 short headings: "What changed", "When it started", "Which systems are linked", and "What may turn red next". Cite exact mission day numbers and concrete indicator changes.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      },
    });

    return res.json({ analysis: (response.text ?? '').trim() });
  } catch (err) {
    return handleGeminiError(err, res);
  }
});

// 3. NASA Research Lookup (with Google Search grounding)
app.post('/api/ai/research', async (req, res) => {
  try {
    const { systemName, status, whyReasons } = req.body as {
      systemName: string;
      status: string;
      whyReasons: string[];
    };

    const ai = getGeminiClient();

    const prompt = [
      `System: ${systemName} (current light: ${status}).`,
      `Today's alert summary: ${whyReasons.join(' ')}`,
      `Search NASA Human Research Program and space-medicine sources to explain in plain English what research says about ${systemName} risks during long-duration space missions (why it happens in space and how crews counter it). Keep the summary concise (3 short paragraphs or bullet points, under 170 words) with zero medical jargon.`,
    ].join('\n\n');

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction:
          'You summarize official NASA and space-medicine research in plain, everyday English for an astronaut. Avoid heavy medical terminology. Focus on why this risk occurs in spaceflight and proven countermeasures.',
      },
    });

    const rawChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const seenUrls = new Set<string>();
    const sources: Array<{ title: string; url: string }> = [];

    for (const chunk of rawChunks) {
      const uri = chunk?.web?.uri;
      const title = chunk?.web?.title;
      if (uri && !seenUrls.has(uri)) {
        seenUrls.add(uri);
        sources.push({
          title: title || uri,
          url: uri,
        });
      }
    }

    return res.json({
      summary: (response.text ?? '').trim(),
      sources: sources.slice(0, 5),
    });
  } catch (err) {
    return handleGeminiError(err, res);
  }
});

// 4. Ground Control Report
app.post('/api/ai/report', async (req, res) => {
  try {
    const { day, systems, last7Days, completedSteps, checkInSummary } = req.body as {
      day: number;
      systems: unknown;
      last7Days: unknown;
      completedSteps: string[];
      checkInSummary: string | null;
    };

    const ai = getGeminiClient();

    const prompt = [
      `Draft a one-page Ground Control Mission Health Report for Mission Day ${day} of 90.`,
      `System Lights & Reasons:\n${JSON.stringify(systems, null, 2)}`,
      `Last 7 Days Values & Drift Scores:\n${JSON.stringify(last7Days, null, 2)}`,
      `Completed Crew Action Steps Today: ${
        completedSteps.length > 0 ? completedSteps.join('; ') : 'None logged yet'
      }`,
      checkInSummary ? `Crew Check-In: ${checkInSummary}` : 'Crew Check-In: Not submitted today',
    ].join('\n\n');

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction:
          'Write a crisp, one-page plain-text Ground Control mission health report in clear, jargon-free English. Include 4 labeled sections: OVERALL STATUS, FLAGGED SYSTEMS, RECENT TRENDS, and RECOMMENDED ACTIONS. Keep it scannable and concise so Flight Surgeons and crew can read it in 45 seconds.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    return res.json({ report: (response.text ?? '').trim() });
  } catch (err) {
    return handleGeminiError(err, res);
  }
});

async function startServer() {
  const port = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`VitalDrift server running on http://0.0.0.0:${port}`);
  });
}

startServer();
