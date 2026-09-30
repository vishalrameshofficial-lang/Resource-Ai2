/**
 * LanguageDetectionService — Modular Indian language detection and capabilities registry.
 *
 * Supports 13 official languages:
 * - Tamil (ta)
 * - Telugu (te)
 * - Kannada (kn)
 * - Malayalam (ml)
 * - Hindi (hi)
 * - Bengali (bn)
 * - Marathi (mr)
 * - Gujarati (gu)
 * - Punjabi (pa)
 * - Odia (or)
 * - Assamese (as)
 * - Urdu (ur)
 * - English (en)
 *
 * Detects language strictly from actual caller speech using Unicode script ranges,
 * phoneme/romanized keyword heuristics, and STT language tags.
 * Preserves original caller transcript and tracks confidence & timestamp.
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'ta', name: 'Tamil',     nativeName: 'தமிழ்',      sttSupported: true, ttsSupported: true, productionReady: true },
  { code: 'te', name: 'Telugu',    nativeName: 'తెలుగు',     sttSupported: true, ttsSupported: true, productionReady: true },
  { code: 'kn', name: 'Kannada',   nativeName: 'ಕನ್ನಡ',      sttSupported: true, ttsSupported: true, productionReady: true },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം',   sttSupported: true, ttsSupported: true, productionReady: true },
  { code: 'hi', name: 'Hindi',     nativeName: 'हिन्दी',     sttSupported: true, ttsSupported: true, productionReady: true },
  { code: 'bn', name: 'Bengali',   nativeName: 'বাংলা',     sttSupported: true, ttsSupported: true, productionReady: true },
  { code: 'mr', name: 'Marathi',   nativeName: 'मराठी',     sttSupported: true, ttsSupported: true, productionReady: true },
  { code: 'gu', name: 'Gujarati',  nativeName: 'ગુજરાતી',   sttSupported: true, ttsSupported: true, productionReady: true },
  { code: 'pa', name: 'Punjabi',   nativeName: 'ਪੰਜਾਬੀ',    sttSupported: true, ttsSupported: true, productionReady: true },
  { code: 'or', name: 'Odia',      nativeName: 'ଓଡ଼ିଆ',      sttSupported: true, ttsSupported: true, productionReady: true },
  { code: 'as', name: 'Assamese',  nativeName: 'অসমীয়া',   sttSupported: true, ttsSupported: true, productionReady: true },
  { code: 'ur', name: 'Urdu',      nativeName: 'اردو',      sttSupported: true, ttsSupported: true, productionReady: true },
  { code: 'en', name: 'English',   nativeName: 'English',   sttSupported: true, ttsSupported: true, productionReady: true },
];

const CODE_TO_NAME = Object.fromEntries(SUPPORTED_LANGUAGES.map(l => [l.code, l.name]));
const NAME_TO_CODE = Object.fromEntries(SUPPORTED_LANGUAGES.map(l => [l.name.toLowerCase(), l.code]));

// Unicode block boundaries for Indian scripts
const SCRIPT_RANGES = [
  { lang: 'Tamil',     code: 'ta', regex: /[\u0B80-\u0BFF]/ },
  { lang: 'Telugu',    code: 'te', regex: /[\u0C00-\u0C7F]/ },
  { lang: 'Kannada',   code: 'kn', regex: /[\u0C80-\u0CFF]/ },
  { lang: 'Malayalam', code: 'ml', regex: /[\u0D00-\u0D7F]/ },
  { lang: 'Gujarati',  code: 'gu', regex: /[\u0A80-\u0AFF]/ },
  { lang: 'Punjabi',   code: 'pa', regex: /[\u0A00-\u0A7F]/ },
  { lang: 'Odia',      code: 'or', regex: /[\u0B00-\u0B7F]/ },
  { lang: 'Bengali',   code: 'bn', regex: /[\u0980-\u09FF]/ },
  { lang: 'Urdu',      code: 'ur', regex: /[\u0600-\u06FF]/ },
  // Devanagari is shared by Hindi and Marathi
  { lang: 'Devanagari', code: 'hi', regex: /[\u0900-\u097F]/ },
];

// Transliterated / Romanized keyword indicators for each language
const ROMAN_KEYWORDS = [
  { lang: 'Tamil',     code: 'ta', regex: /\b(vanakkam|nandri|vellam|thanni|seri|aam|illai|udhavi|thevai|kaapathunga|maruthuvam|engalukku)\b/i },
  { lang: 'Telugu',    code: 'te', regex: /\b(namaskaram|dhanyavadalu|neellu|avunu|ledu|sahayam|kavali|kapadandi|prantham|illu)\b/i },
  { lang: 'Kannada',   code: 'kn', regex: /\b(namaskara|dhanyavada|neeru|houdhu|illa|sahaya|beku|bachisi|ooru|maney)\b/i },
  { lang: 'Malayalam', code: 'ml', regex: /\b(namaskaram|nandi|vellam|athe|illa|sahayam|venam|rakshikku|sthalathu|puzha)\b/i },
  { lang: 'Hindi',     code: 'hi', regex: /\b(namaste|shukriya|pani|haan|nahi|madad|chahiye|bachao|jagah|log|aag|baad)\b/i },
  { lang: 'Bengali',   code: 'bn', regex: /\b(nomoshkar|dhonnobad|jol|paani|hnya|na|sahajjo|dorkar|banchao|jaiga|banya)\b/i },
  { lang: 'Marathi',   code: 'mr', regex: /\b(namaskar|dhanyavad|pani|ho|nahi|madat|pahije|vachva|thikana|poor|aag)\b/i },
  { lang: 'Gujarati',  code: 'gu', regex: /\b(namaste|aabhar|pani|ha|na|madad|joie|bachavo|jagya|puro)\b/i },
  { lang: 'Punjabi',   code: 'pa', regex: /\b(sat siri akal|dhanwad|pani|haan|nahi|madad|chahidi|bachao|jagah)\b/i },
  { lang: 'Odia',      code: 'or', regex: /\b(namaskar|dhanyabad|pani|haan|nahin|sahajya|darkar|rakhya|sthana)\b/i },
  { lang: 'Urdu',      code: 'ur', regex: /\b(adaab|shukriya|pani|haan|nahi|madad|chahiye|bachao|jagah|makaan)\b/i },
];

class LanguageDetectionService {
  /**
   * Detect language from speech text and optional STT language metadata.
   *
   * @param {string} text - Transcribed caller speech
   * @param {Object} [options]
   * @param {string} [options.sttReportedLang] - Language reported by Whisper/STT engine
   * @param {string} [options.currentLockedLang] - Currently active session language
   * @returns {{ language: string, languageCode: string, confidence: number, source: string, detectedAt: string }}
   */
  detectLanguage(text, options = {}) {
    const now = new Date().toISOString();
    const cleanText = (text || '').trim();

    if (!cleanText) {
      return {
        language: options.currentLockedLang || 'English',
        languageCode: NAME_TO_CODE[(options.currentLockedLang || 'English').toLowerCase()] || 'en',
        confidence: 0.5,
        source: 'default',
        detectedAt: now
      };
    }

    // 1. Script-based detection (highest confidence: 0.95 - 0.98)
    for (const { lang, code, regex } of SCRIPT_RANGES) {
      if (regex.test(cleanText)) {
        let finalLang = lang;
        let finalCode = code;

        // Disambiguate Devanagari between Hindi and Marathi
        if (lang === 'Devanagari') {
          if (/[\u0933\u0934]|आहे|नाही|पाहिजे|मदत/i.test(cleanText)) {
            finalLang = 'Marathi';
            finalCode = 'mr';
          } else {
            finalLang = 'Hindi';
            finalCode = 'hi';
          }
        }

        return {
          language: finalLang,
          languageCode: finalCode,
          confidence: 0.96,
          source: 'native_script',
          detectedAt: now
        };
      }
    }

    // 2. Transliterated / Romanized keyword heuristics (confidence: 0.85 - 0.92)
    for (const { lang, code, regex } of ROMAN_KEYWORDS) {
      if (regex.test(cleanText)) {
        return {
          language: lang,
          languageCode: code,
          confidence: 0.88,
          source: 'phonetic_keywords',
          detectedAt: now
        };
      }
    }

    // 3. STT engine reported language (if provided by Whisper)
    if (options.sttReportedLang) {
      const code = options.sttReportedLang.toLowerCase().slice(0, 2);
      if (CODE_TO_NAME[code]) {
        return {
          language: CODE_TO_NAME[code],
          languageCode: code,
          confidence: 0.82,
          source: 'stt_engine',
          detectedAt: now
        };
      }
    }

    // 4. If session already had a locked language and this is a short response like "yes", "okay", keep it
    if (options.currentLockedLang && options.currentLockedLang !== 'English') {
      if (/^(yes|no|ok|okay|sure|correct|haan|s|aam|ho)$/i.test(cleanText)) {
        return {
          language: options.currentLockedLang,
          languageCode: NAME_TO_CODE[options.currentLockedLang.toLowerCase()] || 'en',
          confidence: 0.9,
          source: 'session_continuation',
          detectedAt: now
        };
      }
    }

    // 5. Default English (pure Latin text with standard English vocabulary)
    return {
      language: 'English',
      languageCode: 'en',
      confidence: 0.85,
      source: 'speech_latin',
      detectedAt: now
    };
  }

  /**
   * Check whether caller explicitly switched language mid-conversation
   */
  shouldSwitchLanguage(newDetection, currentLang) {
    if (!currentLang) return true;
    if (newDetection.language === currentLang) return false;
    // Require high confidence (>= 0.88) to switch language mid-stream
    return newDetection.confidence >= 0.88;
  }

  /**
   * Get supported capabilities matrix
   */
  getCapabilities() {
    return SUPPORTED_LANGUAGES;
  }
}

export const languageDetectionService = new LanguageDetectionService();
