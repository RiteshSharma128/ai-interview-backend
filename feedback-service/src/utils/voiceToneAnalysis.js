// ================================================================
// VOICE TONE ANALYSIS SERVICE
// ================================================================
// HOW TO ENABLE:
// 1. Deepgram: Sign up at https://console.deepgram.com
//    - Free $200 credit on signup (no card needed)
//    - Set DEEPGRAM_API_KEY in .env
//    - Set VOICE_ANALYSIS_PROVIDER=deepgram
//
// 2. AssemblyAI: Sign up at https://www.assemblyai.com
//    - Free tier: 3 hours/month transcription
//    - Set ASSEMBLYAI_API_KEY in .env
//    - Set VOICE_ANALYSIS_PROVIDER=assemblyai
// ================================================================

const axios = require('axios');

// ─── DEEPGRAM ANALYSIS ─────────────────────────────────────────
const analyzeWithDeepgram = async (audioBuffer, mimeType = 'audio/wav') => {
  // TODO: Set DEEPGRAM_API_KEY in .env to activate
  // Deepgram docs: https://developers.deepgram.com/docs/getting-started-with-pre-recorded-audio
  const response = await axios.post(
    'https://api.deepgram.com/v1/listen?sentiment=true&detect_topics=true&summarize=true',
    audioBuffer,
    {
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': mimeType,
      },
      timeout: 30000,
    }
  );

  const result = response.data.results;
  const channel = result?.channels?.[0]?.alternatives?.[0];
  const sentiments = result?.sentiments?.segments || [];

  return {
    transcript: channel?.transcript || '',
    confidence: channel?.confidence || 0,
    words: channel?.words || [],
    sentimentOverall: result?.sentiments?.average?.sentiment || 'neutral',
    sentimentScore: result?.sentiments?.average?.sentiment_score || 0,
    topics: result?.topics?.segments?.flatMap(s => s.topics?.map(t => t.topic)) || [],
    summary: result?.summary?.result || '',
    toneAnalysis: {
      confidence: calculateConfidenceScore(channel?.words || []),
      pace: calculatePaceScore(channel?.words || []),
      clarity: Math.round((channel?.confidence || 0) * 100),
    },
    provider: 'deepgram',
  };
};

// ─── ASSEMBLYAI ANALYSIS ───────────────────────────────────────
const analyzeWithAssemblyAI = async (audioUrl) => {
  // TODO: Set ASSEMBLYAI_API_KEY in .env to activate
  // AssemblyAI docs: https://www.assemblyai.com/docs/getting-started

  // Step 1: Submit for transcription
  const submitRes = await axios.post(
    'https://api.assemblyai.com/v2/transcript',
    {
      audio_url: audioUrl,
      sentiment_analysis: true,
      auto_highlights: true,
      iab_categories: true,
    },
    {
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
        'content-type': 'application/json',
      },
    }
  );

  const transcriptId = submitRes.data.id;

  // Step 2: Poll for completion (max 60 seconds)
  let result;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await axios.get(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      { headers: { authorization: process.env.ASSEMBLYAI_API_KEY } }
    );
    result = pollRes.data;
    if (result.status === 'completed' || result.status === 'error') break;
  }

  if (result.status === 'error') {
    throw new Error(`AssemblyAI error: ${result.error}`);
  }

  const sentiments = result.sentiment_analysis_results || [];
  const posCount = sentiments.filter(s => s.sentiment === 'POSITIVE').length;
  const negCount = sentiments.filter(s => s.sentiment === 'NEGATIVE').length;
  const total = sentiments.length || 1;

  return {
    transcript: result.text || '',
    confidence: result.confidence || 0,
    words: result.words || [],
    sentimentOverall: posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : 'neutral',
    sentimentScore: (posCount - negCount) / total,
    topics: result.iab_categories_result?.results?.flatMap(r => r.labels?.map(l => l.label)) || [],
    summary: result.auto_highlights_result?.results?.slice(0, 3).map(h => h.text).join('. ') || '',
    toneAnalysis: {
      confidence: calculateConfidenceScore(result.words || []),
      pace: calculatePaceScore(result.words || []),
      clarity: Math.round((result.confidence || 0) * 100),
    },
    provider: 'assemblyai',
  };
};

// ─── PLACEHOLDER ANALYSIS ──────────────────────────────────────
const placeholderAnalysis = (transcript = '') => {
  // Rule-based analysis when no API key configured
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually'];
  const fillerCount = FILLER_WORDS.filter(fw =>
    new RegExp(`\\b${fw}\\b`, 'gi').test(transcript)
  ).length;

  const positiveWords = ['achieved', 'successfully', 'improved', 'led', 'built', 'solved', 'delivered', 'increased'];
  const negativeWords = ['failed', 'difficult', 'struggled', 'problem', 'issue', 'mistake'];
  const posCount = positiveWords.filter(w => transcript.toLowerCase().includes(w)).length;
  const negCount = negativeWords.filter(w => transcript.toLowerCase().includes(w)).length;

  const confidenceScore = Math.max(0, Math.min(100, 75 - (fillerCount * 10)));
  const sentimentScore = posCount > negCount ? 0.3 : negCount > posCount ? -0.2 : 0;

  return {
    transcript,
    confidence: 0.85,
    words: words.map((w, i) => ({ word: w, start: i * 400, end: (i + 1) * 400 - 100 })),
    sentimentOverall: posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : 'neutral',
    sentimentScore,
    topics: [],
    summary: 'Voice analysis API not configured. Using rule-based analysis.',
    toneAnalysis: {
      confidence: confidenceScore,
      pace: calculatePaceScore(words.map((w, i) => ({ start: i * 400, end: (i + 1) * 400 }))),
      clarity: 75,
    },
    provider: 'placeholder',
    // ENABLE: Set VOICE_ANALYSIS_PROVIDER=deepgram or assemblyai in .env
    setupNote: 'To enable AI voice tone analysis: set DEEPGRAM_API_KEY or ASSEMBLYAI_API_KEY in .env',
  };
};

// ─── HELPER FUNCTIONS ─────────────────────────────────────────
const calculateConfidenceScore = (words) => {
  if (!words.length) return 70;
  // Long pauses between words = less confident
  const avgPause = words.reduce((sum, w, i) => {
    if (i === 0) return sum;
    return sum + (w.start - words[i - 1].end);
  }, 0) / Math.max(1, words.length - 1);
  return Math.max(40, Math.min(100, 85 - (avgPause / 100)));
};

const calculatePaceScore = (words) => {
  if (!words.length) return 70;
  const totalTime = (words[words.length - 1]?.end - words[0]?.start) / 1000 / 60; // minutes
  const wordsPerMinute = words.length / Math.max(0.1, totalTime);
  // Ideal pace: 120-160 wpm
  if (wordsPerMinute >= 120 && wordsPerMinute <= 160) return 95;
  if (wordsPerMinute >= 100 && wordsPerMinute < 120) return 80;
  if (wordsPerMinute > 160 && wordsPerMinute <= 180) return 80;
  if (wordsPerMinute < 100) return 60; // Too slow
  return 65; // Too fast
};

// ─── MAIN EXPORT ──────────────────────────────────────────────
const analyzeVoiceTone = async ({ audioBuffer, audioUrl, transcript }) => {
  const provider = process.env.VOICE_ANALYSIS_PROVIDER;

  try {
    if (provider === 'deepgram' && process.env.DEEPGRAM_API_KEY) {
      return await analyzeWithDeepgram(audioBuffer);
    }
    if (provider === 'assemblyai' && process.env.ASSEMBLYAI_API_KEY && audioUrl) {
      return await analyzeWithAssemblyAI(audioUrl);
    }
  } catch (err) {
    console.error(`Voice analysis error (${provider}):`, err.message);
    // Fallback to placeholder on API error
  }

  return placeholderAnalysis(transcript);
};

module.exports = { analyzeVoiceTone };
