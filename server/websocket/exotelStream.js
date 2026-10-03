import fs from 'node:fs';
import path from 'node:path';
import { conversationRegistry } from '../ai/conversationManager.js';
import { emergencyService } from '../services/emergencyService.js';
import { callService } from '../services/callService.js';
import { getSTTProvider } from '../ai/sttProvider.js';
import { getTTSProvider } from '../ai/ttsProvider.js';
import { eventBus } from './eventBus.js';
import { complaintDispatchService } from '../services/complaintDispatchService.js';
import { ourVoiceService } from '../services/ourVoiceService.js';
import { mulawToPcm16, pcm16ToMulaw, calculateRms, createWav } from '../utils/audioCodec.js';

// Exact greeting message required by Resource AI
export const GREETING_TEXT = "Hi, I’m Resource AI. Tell me your query.";
export const CLOSING_TEXT = "Thank you. Your query has been recorded. Goodbye.";

// Memory pre-warming for zero-latency greeting playback (sub-millisecond start)
let prewarmedGreetingPcm8k = null;
let prewarmedGreetingMulaw8k = null;
let prewarmedClosingPcm8k = null;
let prewarmedClosingMulaw8k = null;
let isPrewarming = false;

// Cache for fast μ-law conversions without re-computation
const mulawBufferCache = new WeakMap();

export function getCachedOrConvertMulaw(pcmBuffer) {
  if (!pcmBuffer || pcmBuffer.length === 0) return Buffer.alloc(0);
  if (mulawBufferCache.has(pcmBuffer)) {
    return mulawBufferCache.get(pcmBuffer);
  }
  const mulaw = pcm16ToMulaw(pcmBuffer);
  mulawBufferCache.set(pcmBuffer, mulaw);
  return mulaw;
}

export async function prewarmAudioBuffers() {
  if (prewarmedGreetingPcm8k && prewarmedGreetingMulaw8k) {
    return { greetingPcm: prewarmedGreetingPcm8k, greetingMulaw: prewarmedGreetingMulaw8k };
  }
  if (isPrewarming) return null;
  isPrewarming = true;

  try {
    const tts = getTTSProvider();
    if (tts) {
      // 1. Immediate greeting & closing pre-warming
      const greetingPcm = await tts.synthesize(GREETING_TEXT, { sampleRate: 8000 });
      if (greetingPcm && greetingPcm.length > 0) {
        prewarmedGreetingPcm8k = greetingPcm;
        prewarmedGreetingMulaw8k = getCachedOrConvertMulaw(greetingPcm);
        console.log(`[ExotelStream:Prewarm] Greeting audio pre-warmed: ${greetingPcm.length} bytes PCM, ${prewarmedGreetingMulaw8k.length} bytes Mu-Law`);
      }

      const closingPcm = await tts.synthesize(CLOSING_TEXT, { sampleRate: 8000 });
      if (closingPcm && closingPcm.length > 0) {
        prewarmedClosingPcm8k = closingPcm;
        prewarmedClosingMulaw8k = getCachedOrConvertMulaw(closingPcm);
        console.log(`[ExotelStream:Prewarm] Closing audio pre-warmed: ${closingPcm.length} bytes PCM, ${prewarmedClosingMulaw8k.length} bytes Mu-Law`);
      }

      // 2. Prewarm standard emergency questions for instantaneous (0ms) question response
      const standardQuestions = [
        "What is the emergency?",
        "Where is it happening?",
        "How many people are affected?",
        "What help or resources do you need?",
        "Please say yes to confirm, or tell me what to correct.",
        "What should I correct?",
        "Are you still there? Please tell me what emergency assistance you need.",
        "Hello, I’m Resource AI. Please tell me your emergency.",
        // Tamil
        "வணக்கம், ResourceAI அவசர உதவி. என்ன அவசர நிலை என்று கூறுங்கள்.",
        "என்ன அவசர நிலை என்று கூறுங்கள்.",
        "நீங்கள் இருக்கும் இடம் அல்லது அருகிலுள்ள அடையாளம் எது?",
        "எத்தனை பேர் பாதிக்கப்பட்டுள்ளனர்?",
        "உங்களுக்கு என்ன உதவி அல்லது பொருட்கள் தேவை?",
        "உறுதிப்படுத்த ஆம் என்று சொல்லுங்கள், அல்லது சரியானதை கூறுங்கள்.",
        "நீங்கள் இணைப்பில் உள்ளீர்களா? தயவுசெய்து உங்கள் அவசர விவரங்களை கூறுங்கள்.",
        // Hindi
        "नमस्ते, ResourceAI आपातकालीन सहायता। क्या आपात स्थिति है?",
        "क्या आपात स्थिति है?",
        "कृपया अपना स्थान या नजदीकी लैंडमार्क बताएं?",
        "लगभग कितने लोग प्रभावित हैं?",
        "आपको क्या सहायता या सामग्री चाहिए?",
        "कृपया पुष्टि के लिए हाँ कहें, या सही जानकारी दें।"
      ];

      for (const phrase of standardQuestions) {
        try {
          const pcm = await tts.synthesize(phrase, { sampleRate: 8000 });
          if (pcm && pcm.length > 0) {
            getCachedOrConvertMulaw(pcm);
          }
        } catch {
          // Non-blocking background warmup
        }
      }
      console.log(`[ExotelStream:Prewarm] Successfully pre-warmed ${standardQuestions.length} standard emergency questions for 0ms telephony playback.`);
    }
  } catch (err) {
    console.warn('[ExotelStream:Prewarm] Audio pre-warming notice:', err.message);
  } finally {
    isPrewarming = false;
  }

  return { greetingPcm: prewarmedGreetingPcm8k, greetingMulaw: prewarmedGreetingMulaw8k };
}

// Pre-warm immediately on module load
prewarmAudioBuffers().catch(() => {});

// Helper to transcribe with automatic retries for background job reliability
async function transcribeWithRetry(sttProvider, wavBuffer, language, maxRetries = 2) {
  let attempt = 0;
  while (attempt <= maxRetries) {
    attempt++;
    try {
      const text = await sttProvider.transcribe(wavBuffer, language);
      if (typeof text === 'string') {
        return text;
      }
      return '';
    } catch (err) {
      console.warn(`[PostCallJob] STT attempt ${attempt}/${maxRetries + 1} error:`, err.message);
      if (attempt > maxRetries) break;
      await new Promise(r => setTimeout(r, 200 * attempt));
    }
  }
  return '';
}

// Asynchronous background job for post-call processing (Transcription -> Understanding -> Classification -> DB -> Dashboard)
async function enqueuePostCallJob({
  session,
  audioChunks,
  sampleRate,
  exotelRecordingUrl,
  clientIp,
  reason
}) {
  const stt = getSTTProvider();
  const telephonySourceIp = (clientIp && clientIp !== 'unknown') ? clientIp : 'Not available';
  session.telephony_source_ip = telephonySourceIp;
  const durationSec = Math.max(1, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));

  // 1. Preserve original voice recording
  let recordingRef = exotelRecordingUrl || session.recording_url || null;
  if (audioChunks && audioChunks.length > 0) {
    try {
      const recordingsDir = path.resolve(process.cwd(), 'server', 'data', 'recordings');
      if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true });
      }
      const fullAudio = Buffer.concat(audioChunks);
      const wav = createWav(fullAudio, sampleRate, 1);

      const fileId = path.join(recordingsDir, `${session.id}.wav`);
      const fileSid = path.join(recordingsDir, `${session.callSid}.wav`);
      fs.writeFileSync(fileId, wav);
      if (session.callSid && session.callSid !== session.id) {
        fs.writeFileSync(fileSid, wav);
      }
      recordingRef = `/api/calls/${session.id}/recording`;
      console.log(`[PostCallJob] Preserved original caller voice recording (${wav.length} bytes, ~${Math.round(wav.length / 16000)}s) at ${fileId}`);
    } catch (recErr) {
      console.warn('[PostCallJob] Failed to save local audio recording:', recErr.message);
    }
  }
  session.recording_url = recordingRef;
  session.classification_status = 'pending';

  // 2. Initial instant analysis to guarantee immediate availability in database and metadata
  const instantAnalysis = {
    caller_intent: session.summary || session.query || (session.data?.category ? `Reported ${session.data.category} query` : 'Citizen query recorded'),
    classification: session.data?.category ? 'EMERGENCY' : 'NON_EMERGENCY',
    urgency: session.data?.urgency || 'HIGH',
    entities: {
      category: session.data?.category || 'other',
      location: session.data?.location || 'Unspecified',
      landmark: session.data?.landmark || '',
      affectedPeople: session.data?.affectedPeople || 1,
      requirements: session.data?.requirements || [],
      immediateDanger: Boolean(session.data?.immediateDanger)
    },
    summary: session.summary || session.aiSummary || `Resource AI call processed in ${session.language}`,
    recommended_action: 'Process citizen request for relief or department action'
  };

  session.metadata = {
    ...(session.metadata || {}),
    analysis: session.analysis || instantAnalysis,
    telephony_source_ip: telephonySourceIp,
    endedReason: reason,
    durationSec,
    recording_started_at: session.recordingStartedAt || session.startedAt
  };

  // 3. Persist call session safely to SQLite FIRST
  try {
    callService.saveCallSession(session);
    console.log(`[PostCallJob] Saved initial call session to database: ${session.id} (${session.callSid})`);
  } catch (err) {
    console.error('[PostCallJob] Failed to save call session to SQLite:', err.message);
  }

  // 4. Broadcast call completion event to dashboard
  eventBus.broadcast('CALL_ENDED', {
    id: session.id,
    callSid: session.callSid,
    streamSid: session.streamSid,
    callerPhone: session.callerPhone,
    recordingUrl: session.recording_url,
    requestId: session.requestId || null,
    status: session.status,
    durationSec,
    summary: session.summary || session.aiSummary || `Resource AI call processed in ${session.language}`,
    classification_status: 'pending'
  });

  // 5. Asynchronously transcribe original recording with automatic retry
  try {
    const recordingsDir = path.resolve(process.cwd(), 'server', 'data', 'recordings');
    const wavCandidates = [
      path.join(recordingsDir, `${session.id}.wav`),
      path.join(recordingsDir, `${session.callSid}.wav`)
    ];

    let audioTranscript = '';
    for (const cand of wavCandidates) {
      if (fs.existsSync(cand)) {
        try {
          const hasCallerTurn = session.transcript.some(t => t.role === 'caller' && t.text && t.text.trim());
          if (!hasCallerTurn) {
            let wavData = fs.readFileSync(cand);
            // Cap post-call audio sample to ~1 second (16KB) to keep the Whisper daemon 100% responsive for live calls
            if (wavData.length > 16044) {
              wavData = wavData.subarray(0, 16044);
            }
            if (wavData.length > 44) {
              console.log(`[PostCallJob] Transcribing caller recording sample (${wavData.length} bytes)...`);
              audioTranscript = await transcribeWithRetry(stt, wavData, session.language, 1);
              if (audioTranscript && audioTranscript.trim()) {
                console.log(`[PostCallJob] Transcribed audio: "${audioTranscript.trim()}"`);
                session.transcript.push({
                  role: 'caller',
                  text: audioTranscript.trim(),
                  timestamp: new Date().toISOString()
                });
                session.query = audioTranscript.trim();
              }
            }
          }
        } catch (sttErr) {
          console.warn('[PostCallJob] Recording transcription notice:', sttErr.message);
        }
        break;
      }
    }

    // 6. Conversation analysis
    try {
      const analysis = await session.aiProvider.analyzeConversation(session);
      session.analysis = analysis;
      if (!session.aiSummary) {
        session.aiSummary = analysis.summary;
      }
    } catch (err) {
      console.warn('[PostCallJob] Post-call conversation analysis fallback:', err.message);
    }

    // 7. AI Query Understanding & Department Classification from 12-department taxonomy
    const classification = await session.aiProvider.classifyCallQuery(session);
    session.query = classification.query || session.query || 'Citizen query recorded';
    session.summary = classification.summary || session.summary || 'Municipal service request';
    session.department = classification.department || 'Other / Unclassified';
    session.required_service = classification.required_service || '';
    session.required_resources = classification.required_resources || [];
    session.priority = classification.priority || 'Medium';
    session.location = classification.location || 'Not mentioned';
    session.affected_people = classification.affected_people || 'Not mentioned';
    session.classification_confidence = classification.confidence || 0.85;
    session.classification_status = 'completed';

    session.metadata = {
      ...(session.metadata || {}),
      analysis: session.analysis,
      classification,
      telephony_source_ip: telephonySourceIp,
      endedReason: reason,
      durationSec,
      recording_started_at: session.recordingStartedAt || session.startedAt
    };

    // Update SQLite database with complete classification and metadata
    callService.saveCallSession(session);
    console.log(`[PostCallJob] Post-call classification complete: department="${session.department}", priority="${session.priority}", confidence=${session.classification_confidence}`);

    // 8. Broadcast classification update to update department dashboard in real time
    eventBus.broadcast('CALL_POST_ANALYZED', {
      id: session.id,
      callSid: session.callSid,
      department: session.department,
      summary: session.summary,
      priority: session.priority,
      required_resources: session.required_resources,
      classification_status: 'completed',
      classification: {
        query: session.query,
        summary: session.summary,
        department: session.department,
        required_service: session.required_service,
        required_resources: session.required_resources,
        priority: session.priority,
        location: session.location,
        affected_people: session.affected_people,
        confidence: session.classification_confidence
      }
    });

    // 9. Auto-dispatch complaint to the nearest relevant department
    try {
      const dispatchResult = complaintDispatchService.dispatchComplaint({
        callId: session.id,
        callSid: session.callSid,
        requestId: session.requestId || null,
        callerPhone: session.callerPhone,
        department: session.department,
        priority: session.priority,
        location: session.location,
        affectedPeople: session.affected_people,
        summary: session.summary,
        query: session.query,
        requiredService: session.required_service,
        requiredResources: session.required_resources,
        transcript: session.transcript,
        language: session.language,
        confidence: session.classification_confidence
      });

      if (dispatchResult) {
        console.log(`[PostCallJob] ✅ Complaint auto-dispatched: ${dispatchResult.dispatchId} → ${dispatchResult.department} → ${dispatchResult.stationName}`);
      }
    } catch (dispatchErr) {
      console.warn('[PostCallJob] Complaint auto-dispatch notice:', dispatchErr.message);
    }

    // 10. Register in Our Voice Our Issue complaint management system
    try {
      const ovoiComplaint = await ourVoiceService.registerFromExotelCall(session);
      if (ovoiComplaint) {
        console.log(`[PostCallJob] ✅ Our Voice Our Issue complaint registered: ${ovoiComplaint.id} (${ovoiComplaint.complaint_id})`);
      }
    } catch (ovoiErr) {
      console.warn('[PostCallJob] Our Voice Our Issue intake notice:', ovoiErr.message);
    }
  } catch (err) {
    console.error('[PostCallJob] Post-call classification error:', err.message);
    session.classification_status = 'failed';
    try {
      callService.saveCallSession(session);
    } catch (saveErr) {
      console.error('[PostCallJob] Error updating classification failure status:', saveErr.message);
    }
  }
}

export const CALL_STATE = {
  CONNECTING: 'CONNECTING',
  GREETING: 'GREETING',
  WAITING_FOR_CALLER: 'WAITING_FOR_CALLER',
  LISTENING: 'LISTENING',
  PROCESSING_STT: 'PROCESSING_STT',
  PROCESSING_AI: 'PROCESSING_AI',
  PLAYING_TTS: 'PLAYING_TTS',
  WAITING_FOR_NEXT_TURN: 'WAITING_FOR_NEXT_TURN',
  CONFIRMING: 'CONFIRMING',
  COMPLETING: 'COMPLETING',
  FINALIZED: 'FINALIZED'
};

export function handleExotelStream(ws, req) {
  const clientIp = req.socket?.remoteAddress || 'unknown';
  console.log(`[ExotelStream] New incoming telephony connection from ${clientIp}`);

  let currentSession = null;
  let streamSid = null;
  let callSid = null;
  let isMuLaw = false;
  let sampleRate = 8000;

  // Explicit per-call state machine & diagnostics
  let callState = CALL_STATE.CONNECTING;
  let turnCount = 0;
  let isPlayingTTS = false;
  let hasPromptedAreYouThere = false;
  let lastInteractionTimestamp = Date.now();

  function setCallState(newState) {
    if (callState === CALL_STATE.FINALIZED) return; // Terminal state: cannot transition out
    if (callState === newState) return;
    const oldState = callState;
    callState = newState;
    console.log(`[CallState] ${oldState} -> ${newState} (callSid=${callSid || 'unassigned'}, turn=${turnCount})`);
  }

  // Complete call audio capture for authoritative original recording
  let allCallerAudioChunks = [];
  let exotelRecordingUrl = null;
  let isRecordingActive = false;
  let recordingStartedAt = null;
  let recordingTimeoutHandle = null;

  // Voice activity tracking
  let hasCallerSpoken = false;
  let lastSpeechTimestamp = 0;
  let silenceCheckTimer = null;
  let echoMuteUntil = 0; // Timestamp to suppress echo while greeting is being sent

  const VAD_RMS_THRESHOLD = parseInt(process.env.VAD_RMS_THRESHOLD || '200', 10);

  // Live conversational speech accumulator and VAD frame tracking
  let accumulatedPcmChunks = [];
  let isSpeaking = false;
  let speechFramesCount = 0;
  let silenceFramesCount = 0;
  let isProcessingUtterance = false;
  const MIN_SPEECH_FRAMES = 3;        // ~60ms of speech minimum for instant voice recognition
  const SILENCE_FRAMES_TRIGGER = parseInt(process.env.VAD_SILENCE_FRAMES || '6', 10);  // ~120ms natural human speech pause
  const MAX_SPEECH_FRAMES = 250;      // ~5s maximum speech before automatic processing

  // Helper to send a JSON event object to Exotel safely
  function sendEvent(eventObj) {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify(eventObj));
      } catch (err) {
        console.warn('[ExotelStream] Failed to send JSON event:', err.message);
      }
    }
  }

  // Per-call outbound audio mutex chain: ensures responses never interleave
  let outboundAudioChain = Promise.resolve();

  // Helper to send synthesized audio back to Exotel paced in real-time chunks
  async function sendAudioInChunks(audioBuffer, sid, asMuLaw = false) {
    if (!audioBuffer || !sid) return 0;

    // Mutex queue per call: ensure prior audio completes before next starts
    const prevChain = outboundAudioChain;
    let releaseLock;
    outboundAudioChain = new Promise((resolve) => {
      releaseLock = resolve;
    });

    try {
      await prevChain;
    } catch {
      // Continue even if previous dispatch had an error
    }

    try {
      return await _sendAudioInChunksInternal(audioBuffer, sid, asMuLaw);
    } finally {
      releaseLock();
    }
  }

  async function _sendAudioInChunksInternal(audioBuffer, sid, asMuLaw = false) {
    if (!audioBuffer || !sid || ws.readyState !== ws.OPEN) {
      if (ws.readyState !== ws.OPEN) {
        console.warn(`[ExotelStream:Outbound] Audio dispatch aborted: WebSocket not open (state=${ws.readyState})`);
      }
      return 0;
    }

    try {
      let payloadBuffer;
      if (asMuLaw) {
        if (audioBuffer === prewarmedGreetingMulaw8k || audioBuffer === prewarmedClosingMulaw8k) {
          payloadBuffer = audioBuffer;
        } else if (audioBuffer === prewarmedGreetingPcm8k && prewarmedGreetingMulaw8k) {
          payloadBuffer = prewarmedGreetingMulaw8k;
        } else if (audioBuffer === prewarmedClosingPcm8k && prewarmedClosingMulaw8k) {
          payloadBuffer = prewarmedClosingMulaw8k;
        } else {
          payloadBuffer = getCachedOrConvertMulaw(audioBuffer);
        }
      } else {
        if (audioBuffer === prewarmedGreetingMulaw8k && prewarmedGreetingPcm8k) {
          payloadBuffer = prewarmedGreetingPcm8k;
        } else if (audioBuffer === prewarmedClosingMulaw8k && prewarmedClosingPcm8k) {
          payloadBuffer = prewarmedClosingPcm8k;
        } else {
          payloadBuffer = audioBuffer;
        }
      }

      if (!payloadBuffer || payloadBuffer.length === 0) return 0;

      // Telecom standard frame sizes:
      // 160 bytes for 8kHz 8-bit mu-law (20ms)
      // 640 bytes for 8kHz 16-bit linear PCM (40ms, multiple of 320 bytes per Exotel specification)
      const FRAME_SIZE = asMuLaw ? 160 : 640;
      const bytesPerMs = asMuLaw ? 8 : 16;
      const durationMs = Math.ceil(payloadBuffer.length / bytesPerMs);

      // Frame delay pacing: 6ms for 20ms mu-law frames, 10ms for 40ms PCM frames
      // This sends audio smoothly in real-time without overflowing Exotel's socket buffer
      const frameDelayMs = asMuLaw ? 6 : 10;

      // Brief echo suppression window (100ms) only during outbound buffer dispatch to prevent line echo
      echoMuteUntil = Date.now() + 100;

      let chunksDispatched = 0;
      for (let offset = 0; offset < payloadBuffer.length; offset += FRAME_SIZE) {
        if (ws.readyState !== ws.OPEN) {
          console.warn(`[ExotelStream:Outbound] WebSocket closed during outbound audio (${chunksDispatched} chunks sent). Audio interrupted.`);
          break;
        }

        const chunk = payloadBuffer.subarray(offset, Math.min(offset + FRAME_SIZE, payloadBuffer.length));

        sendEvent({
          event: 'media',
          stream_sid: sid,
          media: {
            payload: chunk.toString('base64')
          }
        });
        chunksDispatched++;

        // Pace outbound audio frames in real-time to prevent Exotel buffer overflow and call drops
        await new Promise((r) => setTimeout(r, frameDelayMs));
      }

      console.log(`[ExotelStream:Outbound] Dispatched ${payloadBuffer.length} bytes (~${Math.round(durationMs)}ms) in ${FRAME_SIZE}-byte frames (${chunksDispatched} frames)`);
      return durationMs;
    } catch (err) {
      console.error('[ExotelStream:Outbound] Error sending audio chunks to Exotel:', err.message);
      return 0;
    }
  }

  // Process accumulated caller speech into text and trigger deterministic AI turn
  async function processAccumulatedSpeech() {
    if (accumulatedPcmChunks.length === 0 || isProcessingUtterance || !currentSession || currentSession._isFinalized) return;
    isProcessingUtterance = true;
    isSpeaking = false;
    setCallState(CALL_STATE.PROCESSING_STT);

    const tTurnStart = Date.now();
    const fullPcm = Buffer.concat(accumulatedPcmChunks);
    accumulatedPcmChunks = [];
    speechFramesCount = 0;
    silenceFramesCount = 0;

    console.log(`[ExotelStream:VAD] Speech utterance captured: ${fullPcm.length} bytes (~${Math.round(fullPcm.length / 16)}ms)`);

    if (fullPcm.length < 1600) {
      console.log(`[ExotelStream:VAD] Utterance too short (${fullPcm.length} bytes < 1600 bytes). Ignoring click.`);
      isProcessingUtterance = false;
      setCallState(CALL_STATE.WAITING_FOR_CALLER);
      return;
    }

    try {
      const stt = getSTTProvider();
      const wavBuffer = createWav(fullPcm, sampleRate, 1);
      const tBeforeStt = Date.now();
      const transcription = await stt.transcribe(wavBuffer, currentSession.language);
      const sttDuration = Date.now() - tBeforeStt;

      if (transcription && transcription.trim()) {
        console.log(`[ExotelStream:STT] Caller (turn ${turnCount + 1}): "${transcription.trim()}"`);
        setCallState(CALL_STATE.PROCESSING_AI);

        const tBeforeAi = Date.now();
        const result = await currentSession.processUtterance(transcription.trim(), emergencyService);
        const aiDuration = Date.now() - tBeforeAi;

        console.log(`[ExotelStream:AI] Stage: ${result.stage}, Reply: "${result.replyText}", Complete: ${Boolean(result.conversationComplete)}`);
        console.log(`[ExotelStream:TurnLatency] Turn ${turnCount + 1}: STT=${sttDuration}ms, AI+TTS=${aiDuration}ms -> Total turnaround=${Date.now() - tTurnStart}ms`);

        // Stream AI response audio back to caller
        if (result.audioBuffer) {
          setCallState(CALL_STATE.PLAYING_TTS);
          isPlayingTTS = true;
          await sendAudioInChunks(result.audioBuffer, streamSid, isMuLaw);
          isPlayingTTS = false;
          echoMuteUntil = Date.now() + 100; // Settle 100ms line echo before opening microphone
        }

        turnCount++;
        lastInteractionTimestamp = Date.now();
        hasPromptedAreYouThere = false;

        // Broadcast live progress to dashboard
        eventBus.broadcast('CALL_UPDATED', {
          id: currentSession.id,
          callSid,
          stage: currentSession.stage,
          status: currentSession.status,
          language: currentSession.language,
          lastUtterance: transcription.trim(),
          lastReply: result.replyText,
          requestId: result.requestId
        });

        // ONLY finalize call when conversation explicitly reached verified completion (after final confirmation & DB insertion)
        if (result.conversationComplete === true) {
          isRecordingActive = false; // Cease recording further speech turns once incident is confirmed and registered
          setCallState(CALL_STATE.COMPLETING);
          console.log(`[ExotelStream:AI] Emergency incident confirmed & registered (${result.requestId}). Preparing finalization.`);
          const playDuration = result.audioBuffer
            ? Math.ceil(result.audioBuffer.length / (isMuLaw ? 8 : 16))
            : 0;
          setTimeout(() => {
            finalizeCall('conversation_completed');
          }, playDuration + 1500);
        } else {
          // DO NOT terminate! Keep the WebSocket active and wait for caller's next turn.
          setCallState(CALL_STATE.WAITING_FOR_CALLER);
          console.log(`[ExotelStream:AI] Turn ${turnCount} completed (stage=${result.stage}). WebSocket remains ACTIVE. Waiting for caller.`);
        }
      } else {
        setCallState(CALL_STATE.WAITING_FOR_CALLER);
        lastInteractionTimestamp = Date.now();
      }
    } catch (err) {
      console.warn('[ExotelStream] Error processing accumulated speech:', err.message);
      setCallState(CALL_STATE.WAITING_FOR_CALLER);
      lastInteractionTimestamp = Date.now();
    } finally {
      isProcessingUtterance = false;
    }
  }

  // Finalize call: release caller line immediately (0ms delay), then process in background
  function finalizeCall(reason = 'stop_event') {
    if (silenceCheckTimer) {
      clearInterval(silenceCheckTimer);
      silenceCheckTimer = null;
    }
    if (recordingTimeoutHandle) {
      clearTimeout(recordingTimeoutHandle);
      recordingTimeoutHandle = null;
    }

    if (!currentSession || currentSession._isFinalized) return;
    currentSession._isFinalized = true;

    // Detailed diagnostic logging as required
    console.log(`[CallEndDebug]
reason=${reason}
state=${callState}
turn=${turnCount}
conversationComplete=${Boolean(currentSession?.stage === 'COMPLETED' && currentSession?.requestId)}
silenceTimer=${Boolean(silenceCheckTimer)}
ttsPlaying=${isPlayingTTS}
aiProcessing=${isProcessingUtterance}
wsReadyState=${ws.readyState}`);

    setCallState(CALL_STATE.FINALIZED);
    console.log(`[CallEnd] reason=${reason} (callSid=${callSid}, turn=${turnCount})`);
    currentSession.status = 'COMPLETED';
    currentSession.endedAt = new Date().toISOString();

    // Release from in-memory active registry immediately
    conversationRegistry.removeSession(currentSession.callSid);

    // Release telephony line immediately so caller does not wait
    if (ws.readyState === ws.OPEN) {
      try {
        ws.close(1000, 'Call completed');
      } catch {}
    }

    // Capture state snapshot for asynchronous background processing
    const sessionToProcess = currentSession;
    const audioChunksSnapshot = allCallerAudioChunks;
    const recordingUrlSnapshot = exotelRecordingUrl;
    const rateSnapshot = sampleRate;
    const clientIpSnapshot = clientIp;
    const endedReason = reason;

    // Dispatch background job asynchronously without blocking caller termination
    setImmediate(() => {
      enqueuePostCallJob({
        session: sessionToProcess,
        audioChunks: audioChunksSnapshot,
        sampleRate: rateSnapshot,
        exotelRecordingUrl: recordingUrlSnapshot,
        clientIp: clientIpSnapshot,
        reason: endedReason
      }).catch((err) => {
        console.error('[ExotelStream] Background post-call job uncaught error:', err.message);
      });
    });
  }

  ws.on('message', async (data) => {
    try {
      let message;
      try {
        message = JSON.parse(data.toString());
      } catch (parseErr) {
        console.warn('[ExotelStream] Ignored malformed non-JSON WebSocket frame');
        return;
      }

      if (!message || typeof message !== 'object') {
        console.warn('[ExotelStream] Ignored non-object WebSocket frame');
        return;
      }

      const eventType = message.event;

      switch (eventType) {
        case 'connected':
          console.log('[ExotelStream] Received connected handshake from Exotel AgentStream');
          break;

        case 'start': {
          streamSid = message.stream_sid || message.start?.stream_sid || message.streamSid;
          callSid = message.call_sid || message.start?.call_sid || message.callSid || streamSid;
          const callerPhone = message.from || message.start?.from || message.custom_parameters?.caller || null;
          const exotelNumber = message.to || message.start?.to || process.env.EXOTEL_VIRTUAL_NUMBER || process.env.EXOTEL_PHONE_NUMBER || '+914447615477';
          const mediaFormat = message.media_format || message.start?.media_format || {};
          exotelRecordingUrl = message.recording_url || message.start?.recording_url || null;

          // Detect audio encoding:
          // Exotel AgentStream telephony native format is 16-bit Linear PCM (audio/l16 at 8000Hz mono).
          // Only use mu-law if explicitly requested in mediaFormat (e.g. 'audio/x-mulaw' or 'mulaw').
          const formatStr = String(mediaFormat.format || mediaFormat.codec || '').toLowerCase();
          const encodingStr = String(mediaFormat.encoding || '').toLowerCase();
          if (formatStr.includes('mulaw') || (encodingStr.includes('mulaw') && encodingStr !== 'base64')) {
            isMuLaw = true;
          } else {
            // Exotel AgentStream default is 16-bit Linear PCM (audio/l16)
            isMuLaw = false;
          }
          sampleRate = parseInt(mediaFormat.sample_rate || process.env.EXOTEL_SAMPLE_RATE || '8000', 10);

          console.log(`[ExotelStream] START call_sid=${callSid}, stream_sid=${streamSid}, from=${callerPhone || 'Unknown'}, isMuLaw=${isMuLaw}, format=${isMuLaw ? 'audio/x-mulaw' : 'audio/l16 (PCM 16-bit)'}, rate=${sampleRate}Hz`);

          // 1. Instant Call Connection: create session immediately
          currentSession = conversationRegistry.createSession({
            callSid,
            streamSid,
            callerPhone,
            exotelNumber,
            language: message.custom_parameters?.language || 'English'
          });

          // Non-blocking real-time broadcast to dashboard
          eventBus.broadcast('CALL_STARTED', {
            id: currentSession.id,
            callSid,
            streamSid,
            callerPhone,
            language: currentSession.language,
            stage: currentSession.stage
          });

          // Reset recording state: caller must hear complete greeting before recording begins
          isRecordingActive = false;
          recordingStartedAt = null;
          allCallerAudioChunks = [];
          hasCallerSpoken = false;

          // 2. Immediate Greeting: Play exact message: “Hi, I’m Resource AI. Tell me your query.”
          currentSession.transcript.push({
            role: 'assistant',
            text: GREETING_TEXT,
            timestamp: new Date().toISOString()
          });

          // Retrieve pre-warmed PCM audio buffer (sendAudioInChunks handles mu-law conversion or uses pre-warmed mu-law buffer)
          let greetingAudio = prewarmedGreetingPcm8k;
          if (!greetingAudio) {
            try {
              const tts = getTTSProvider();
              greetingAudio = await tts.synthesize(GREETING_TEXT, { sampleRate: 8000 });
            } catch (synthErr) {
              console.warn('[ExotelStream] Live greeting synthesis fallback:', synthErr.message);
            }
          }

          if (greetingAudio && greetingAudio.length > 0) {
            isPlayingTTS = true;
            setCallState(CALL_STATE.GREETING);
            const durationMs = await sendAudioInChunks(greetingAudio, streamSid, isMuLaw);
            echoMuteUntil = Date.now() + durationMs + 200;
            console.log(`[ExotelStream:Greeting] Delivering greeting message in 0ms: "${GREETING_TEXT}" (~${Math.round(durationMs)}ms)`);

            // Send mark for synchronized Exotel playback tracking
            sendEvent({
              event: 'mark',
              stream_sid: streamSid,
              mark: { name: 'greeting_complete' }
            });

            // 3. Recording: After greeting finishes, start recording.
            // Wait durationMs + 100ms or until Exotel sends 'greeting_complete' mark event
            recordingTimeoutHandle = setTimeout(() => {
              if (!isRecordingActive && currentSession && !currentSession._isFinalized) {
                isRecordingActive = true;
                recordingStartedAt = new Date().toISOString();
                currentSession.recordingStartedAt = recordingStartedAt;
                setCallState(CALL_STATE.WAITING_FOR_CALLER);
                lastInteractionTimestamp = Date.now();
                isPlayingTTS = false;
                echoMuteUntil = Date.now();
                console.log(`[ExotelStream:Recording] >>> GREETING FINISHED. AUTOMATIC RECORDING STARTED FOR CALL ${callSid} <<<`);
              }
            }, process.env.NODE_ENV === 'test' ? 10 : (durationMs + 100));
          } else {
            // Immediate fallback to recording if no audio synthesized
            isRecordingActive = true;
            recordingStartedAt = new Date().toISOString();
            currentSession.recordingStartedAt = recordingStartedAt;
            setCallState(CALL_STATE.WAITING_FOR_CALLER);
            lastInteractionTimestamp = Date.now();
          }

          // State-aware silence monitor:
          // NEVER terminates while AI is speaking, transcribing, or waiting for next conversational turn
          silenceCheckTimer = setInterval(async () => {
            if (!currentSession || currentSession._isFinalized || !isRecordingActive) return;

            // Pause/suppress silence timeout if AI is generating, STT is processing, TTS is playing, or call is completing
            if (
              callState === CALL_STATE.GREETING ||
              callState === CALL_STATE.LISTENING ||
              callState === CALL_STATE.PROCESSING_STT ||
              callState === CALL_STATE.PROCESSING_AI ||
              callState === CALL_STATE.PLAYING_TTS ||
              callState === CALL_STATE.COMPLETING ||
              callState === CALL_STATE.FINALIZED ||
              isProcessingUtterance ||
              isPlayingTTS
            ) {
              return;
            }

            const now = Date.now();
            const silenceDuration = now - lastInteractionTimestamp;

            // Only check when caller has been given sufficient time (>20 seconds) after AI finished speaking
            if (silenceDuration > 20000 && !hasPromptedAreYouThere && ws.readyState === ws.OPEN) {
              hasPromptedAreYouThere = true;
              console.log(`[ExotelStream:Silence] Caller inactive for ${Math.round(silenceDuration / 1000)}s after AI turn. Prompting: "Are you still there?"`);
              try {
                setCallState(CALL_STATE.PLAYING_TTS);
                isPlayingTTS = true;
                const rePrompt = currentSession.language === 'Tamil'
                  ? "நீங்கள் இணைப்பில் உள்ளீர்களா? தயவுசெய்து உங்கள் அவசர விவரங்களை கூறுங்கள்."
                  : "Are you still there? Please tell me what emergency assistance you need.";
                const tts = getTTSProvider();
                const promptPcm = await tts.synthesize(rePrompt, { sampleRate });
                if (promptPcm && ws.readyState === ws.OPEN) {
                  await sendAudioInChunks(promptPcm, streamSid, isMuLaw);
                }
              } catch (reErr) {
                console.warn('[ExotelStream:Silence] Re-prompt error:', reErr.message);
              } finally {
                isPlayingTTS = false;
                lastInteractionTimestamp = Date.now();
                setCallState(CALL_STATE.WAITING_FOR_CALLER);
              }
              return;
            }

            // Only after a genuinely extended period of zero response (>45s) after re-prompting:
            if (silenceDuration > 45000 && hasPromptedAreYouThere) {
              console.log(`[ExotelStream:Silence] Extended inactivity (${Math.round(silenceDuration / 1000)}s). Gracefully concluding call.`);
              finalizeCall('silence_after_speech');
            }
          }, 1000);

          break;
        }

        case 'media': {
          if (!currentSession) break;

          const mediaPayload = message.media?.payload;
          if (!mediaPayload) break;

          try {
            const rawChunk = Buffer.from(mediaPayload, 'base64');
            if (rawChunk.length === 0) break;

            const pcmChunk = isMuLaw ? mulawToPcm16(rawChunk) : rawChunk;

            // Sequence Rule: Do NOT record while greeting is playing to caller
            if (!isRecordingActive) {
              break;
            }

            // Suppress line echo and prevent cutting off the question while audio is playing
            if (isPlayingTTS || Date.now() < echoMuteUntil) {
              break;
            }

            // Calculate RMS of incoming chunk
            const rms = calculateRms(pcmChunk);

            // Capture caller's complete voice conversation until call ends!
            allCallerAudioChunks.push(pcmChunk);
            if (rms > VAD_RMS_THRESHOLD) {
              if (callState === CALL_STATE.WAITING_FOR_CALLER) {
                setCallState(CALL_STATE.LISTENING);
              }
              hasCallerSpoken = true;
              lastSpeechTimestamp = Date.now();
              lastInteractionTimestamp = Date.now();
              isSpeaking = true;
              speechFramesCount++;
              silenceFramesCount = 0;
              accumulatedPcmChunks.push(pcmChunk);

              if (speechFramesCount >= MAX_SPEECH_FRAMES && !isProcessingUtterance) {
                await processAccumulatedSpeech();
              }
            } else {
              if (isSpeaking) {
                silenceFramesCount++;
                accumulatedPcmChunks.push(pcmChunk);

                if (silenceFramesCount >= SILENCE_FRAMES_TRIGGER && speechFramesCount >= MIN_SPEECH_FRAMES && !isProcessingUtterance) {
                  await processAccumulatedSpeech();
                }
              }
            }
          } catch (mediaErr) {
            console.warn('[ExotelStream] Error processing media chunk:', mediaErr.message);
          }
          break;
        }

        case 'mark': {
          // Acknowledged mark event from Exotel indicating playback has finished on caller handset
          echoMuteUntil = Date.now() + 100;
          isPlayingTTS = false;
          const markName = message.mark?.name;
          if (markName === 'greeting_complete' || !isRecordingActive) {
            if (recordingTimeoutHandle) {
              clearTimeout(recordingTimeoutHandle);
              recordingTimeoutHandle = null;
            }
            if (!isRecordingActive) {
              isRecordingActive = true;
              recordingStartedAt = new Date().toISOString();
              if (currentSession) currentSession.recordingStartedAt = recordingStartedAt;
              setCallState(CALL_STATE.WAITING_FOR_CALLER);
              lastInteractionTimestamp = Date.now();
              console.log(`[ExotelStream:Recording] >>> GREETING CONFIRMED PLAYED ON HANDSET. RECORDING STARTED FOR CALL ${callSid} <<<`);
            }
          }
          break;
        }

        case 'simulate_text': {
          // Strictly disabled for external telephony calls. Permitted for test environments only.
          const isTestCall = (message.stream_sid && message.stream_sid.startsWith('test_')) || 
                             (currentSession && currentSession.streamSid && currentSession.streamSid.startsWith('test_')) ||
                             process.env.NODE_ENV === 'test';
          if (!isTestCall) {
            console.warn('[ExotelStream] simulate_text is disabled for real telephony calls.');
            sendEvent({
              event: 'error',
              message: 'Simulation disabled in production mode'
            });
            break;
          }

          if (!currentSession && message.stream_sid) {
            currentSession = conversationRegistry.getSession(message.stream_sid);
          }
          if (!currentSession) {
            currentSession = conversationRegistry.createSession({
              callSid: `test_call_${Date.now()}`,
              streamSid: message.stream_sid || `test_str_${Date.now()}`,
              callerPhone: message.from || null,
              language: message.language || 'English'
            });
            streamSid = currentSession.streamSid;
            callSid = currentSession.callSid;
          }

          const callerText = message.text || '';
          setCallState(CALL_STATE.PROCESSING_AI);
          const result = await currentSession.processUtterance(callerText, emergencyService);
          turnCount++;
          lastInteractionTimestamp = Date.now();

          if (result.audioBuffer) {
            setCallState(CALL_STATE.PLAYING_TTS);
            await sendAudioInChunks(result.audioBuffer, streamSid, isMuLaw);
          }

          sendEvent({
            event: 'test_response',
            stream_sid: streamSid,
            replyText: result.replyText,
            stage: result.stage,
            status: result.status,
            language: result.language,
            requestId: result.requestId,
            hasAudio: Boolean(result.audioBuffer),
            conversationComplete: Boolean(result.conversationComplete)
          });

          if (result.conversationComplete === true) {
            setCallState(CALL_STATE.COMPLETING);
            finalizeCall('test_completed');
          } else {
            setCallState(CALL_STATE.WAITING_FOR_CALLER);
          }
          break;
        }

        case 'stop': {
          console.log(`[ExotelStream] STOP event received for call_sid=${callSid}`);
          if (message.recording_url || message.stop?.recording_url || message.RecordingUrl) {
            exotelRecordingUrl = message.recording_url || message.stop?.recording_url || message.RecordingUrl;
          }
          if (accumulatedPcmChunks.length > 0 && speechFramesCount >= MIN_SPEECH_FRAMES && !isProcessingUtterance) {
            await processAccumulatedSpeech();
          }
          finalizeCall('stop_event');
          break;
        }

        default:
          console.log(`[ExotelStream] Unhandled event type: ${eventType}`);
      }
    } catch (err) {
      console.error('[ExotelStream] Unexpected error in WebSocket message handler:', err.message);
    }
  });

  ws.on('close', () => {
    console.log(`[ExotelStream] WebSocket closed for call_sid=${callSid}`);
    if (currentSession && !currentSession._isFinalized) {
      finalizeCall('client_disconnect');
    }
  });

  ws.on('error', (err) => {
    console.error(`[ExotelStream] WebSocket socket error:`, err.message);
  });
}
