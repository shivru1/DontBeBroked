import { blobToBase64 } from '../utils/audioRecorder';

const GEMINI_API_KEY = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '';

/**
 * Transcribes an audio blob into text using gemini-3.5-transcribe model,
 * with graceful fallback to SpeechRecognition or secondary Gemini multimodal model if needed.
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const base64Data = await blobToBase64(audioBlob);

  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'MY_GEMINI_API_KEY' || GEMINI_API_KEY.length < 10) {
    throw new Error('Gemini API key is not configured.');
  }

  // Primary model as requested: gemini-3.5-transcribe
  const primaryUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-transcribe:generateContent?key=${GEMINI_API_KEY}`;
  
  try {
    const res = await fetch(primaryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/wav',
                  data: base64Data
                }
              },
              {
                text: 'Transcribe the spoken audio verbatim. Only return the exact transcription text without commentary or quotation marks.'
              }
            ]
          }
        ]
      })
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) {
        return text;
      }
      // If empty candidates or silent audio
      return '';
    }

    const errorData = await res.json().catch(() => null);
    console.warn('gemini-3.5-transcribe response issue:', res.status, errorData);

    // If quota exhausted (429) or temporary server issue, fallback to gemini-3.5-flash / gemini-2.5-flash which also accepts audio/wav
    if (res.status === 429 || res.status >= 500) {
      console.log('Attempting fallback audio transcription with gemini-2.5-flash...');
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: 'audio/wav',
                    data: base64Data
                  }
                },
                {
                  text: 'Transcribe the spoken audio verbatim. Only output the transcription text.'
                }
              ]
            }
          ]
        })
      });

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        return fallbackData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      }
    }

    throw new Error(errorData?.error?.message || `Transcription failed with status ${res.status}`);
  } catch (err: any) {
    console.error('Transcription error:', err);
    throw err;
  }
}
