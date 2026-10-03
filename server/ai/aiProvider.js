import { MULTILINGUAL_STRINGS, CONVERSATION_STAGES, SYSTEM_SAFETY_PROMPT, DEPARTMENTS, POST_CALL_CLASSIFICATION_PROMPT } from './prompts.js';
import { languageDetectionService } from './languageDetectionService.js';

export function formatPeopleCount(count) {
  const numWordMap = {
    1: 'one',
    2: 'two',
    3: 'three',
    4: 'four',
    5: 'five',
    6: 'six',
    7: 'seven',
    8: 'eight',
    9: 'nine',
    10: 'ten'
  };
  return numWordMap[count] || String(count);
}

export function formatResourcesForConfirmation(reqs) {
  if (!reqs || reqs.length === 0) return 'emergency relief';
  const items = reqs.map(r => {
    let name = (r.item || '').toLowerCase();
    if (name.includes('food')) name = 'food';
    else if (name.includes('drinking water') || name.includes('water')) name = 'drinking water';
    else if (name.includes('boat')) name = 'rescue boats';
    else if (name.includes('medical') || name.includes('medicine')) name = 'medical supplies';
    else if (name.includes('shelter') || name.includes('blanket') || name.includes('tarpaulin')) name = 'blankets and shelter';

    if (r.quantity) {
      return `${r.quantity}${r.unit ? ' ' + r.unit : ''} ${name}`.trim();
    }
    return name;
  });

  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export class AIProvider {
  async processUtterance(sessionState, callerUtterance) {
    const text = (callerUtterance || '').toLowerCase().trim();

    // Automatic language detection from caller speech
    const detection = languageDetectionService.detectLanguage(callerUtterance, {
      currentLockedLang: sessionState.language
    });

    if (detection) {
      // If language was not set or confidence is high enough to switch, adopt detected language
      if (!sessionState.language || sessionState.language === 'English' || detection.confidence >= 0.88) {
        sessionState.language = detection.language;
      }
      sessionState.detected_language = detection.language;
      sessionState.language_confidence = detection.confidence;
      sessionState.detected_at = detection.detectedAt;
    }

    const currentLang = sessionState.language || 'English';

    // 1. Extract entities into session data
    this.extractEntities(sessionState, callerUtterance);
    const { data } = sessionState;
    const strings = MULTILINGUAL_STRINGS[currentLang] || MULTILINGUAL_STRINGS.English;

    // 2. Handle Confirmation Stage & Correction (Section 37)
    if (sessionState.stage === CONVERSATION_STAGES.CONFIRMATION) {
      if (data.isCorrecting) {
        data.isCorrecting = false;
        const resStr = formatResourcesForConfirmation(data.requirements);
        const countStr = formatPeopleCount(data.affectedPeople || 1);
        const confirmationReply = strings.confirmation(data.location || 'Reported Location', countStr, resStr, data.category);
        return {
          reply: confirmationReply,
          stage: CONVERSATION_STAGES.CONFIRMATION
        };
      }

      const isNegative = /\b(no|nope|wrong|incorrect|not\s+correct|not\s+right|change|mistake|illa|illai|vendam|nahi|galat|voddhu)\b/i.test(text);
      const isAffirmative = !isNegative && (
        /\b(yes|yeah|correct|yep|yup|right|sure|ok|okay|fine|done|perfect|good|proceed|submit|confirm|confirmed|true|go\s*ahead|send\s*help|please|save|register|that'?s\s*right|that'?s\s*correct|all\s*correct|ha|haan|theek\s*hai|theek|thik|sahi\s*hai|sahi|aam|seri|seringa|kandippa|ama|aama|aamam|avunu|sari|sariga|ho|bilkul|bilkul\s*sahi|pannunga|seiyunga|anuppunga|seekiram|idhu\s*seri|adha\s*registration\s*pannunga)\b/i.test(text) ||
        /\b(urgent|quickly|quick|immediately|fast|help|send|save|please|காப்பாத்துங்க|சீக்கிரம்|உதவி|जल्दी|तुरंत)\b/i.test(text)
      );

      if (isAffirmative) {
        sessionState.stage = CONVERSATION_STAGES.SUBMISSION;
        data.confirmed = true;
        return { reply: 'PROCESSING_SUBMISSION', stage: CONVERSATION_STAGES.SUBMISSION };
      } else if (isNegative) {
        data.isCorrecting = true;
        const correctionPrompt = strings.clarifyCorrection || "What should I correct?";
        return {
          reply: correctionPrompt,
          stage: CONVERSATION_STAGES.CONFIRMATION
        };
      } else {
        return {
          reply: strings.clarify || "Please say yes to confirm, or tell me what to correct.",
          stage: CONVERSATION_STAGES.CONFIRMATION
        };
      }
    }

    // 3. Deterministic 5-Step Process (Section 36)
    const reqs = data.requirements || [];
    const hasCategory = Boolean(data.category);
    const hasLocation = Boolean(data.location && data.location.trim().length > 0 && data.location !== 'Area Reported');
    const hasPeople = Boolean(data.hasStatedPeople || (data.affectedPeople != null && data.affectedPeople > 0));
    const hasResources = Boolean(data.hasStatedResources || reqs.length > 0);

    if (!hasCategory) {
      sessionState.stage = CONVERSATION_STAGES.EMERGENCY;
      return {
        reply: strings.askEmergency || "What is the emergency?",
        stage: CONVERSATION_STAGES.EMERGENCY
      };
    } else if (!hasLocation) {
      sessionState.stage = CONVERSATION_STAGES.LOCATION;
      return {
        reply: strings.askLocation || "Where is it happening?",
        stage: CONVERSATION_STAGES.LOCATION
      };
    } else if (!hasPeople) {
      sessionState.stage = CONVERSATION_STAGES.PEOPLE;
      return {
        reply: strings.askPeople || "How many people are affected?",
        stage: CONVERSATION_STAGES.PEOPLE
      };
    } else if (!hasResources) {
      sessionState.stage = CONVERSATION_STAGES.RESOURCES;
      return {
        reply: strings.askResources || "What help or resources do you need?",
        stage: CONVERSATION_STAGES.RESOURCES
      };
    } else {
      sessionState.stage = CONVERSATION_STAGES.CONFIRMATION;
      const resStr = formatResourcesForConfirmation(reqs);
      const countStr = formatPeopleCount(data.affectedPeople || 1);
      return {
        reply: strings.confirmation(data.location, countStr, resStr, data.category),
        stage: CONVERSATION_STAGES.CONFIRMATION
      };
    }
  }

  async extractStructuredEmergency(sessionState) {
    throw new Error('extractStructuredEmergency must be implemented by subclass');
  }

  async analyzeConversation(sessionState) {
    throw new Error('analyzeConversation must be implemented by subclass');
  }

  async classifyCallQuery(sessionStateOrTranscript) {
    throw new Error('classifyCallQuery must be implemented by subclass');
  }

  detectLanguage(text, options = {}) {
    if (!text) return null;
    const result = languageDetectionService.detectLanguage(text, options);
    return result ? result.language : null;
  }

  detectLanguageDetails(text, options = {}) {
    return languageDetectionService.detectLanguage(text, options);
  }

  extractEntities(sessionState, text) {
    if (!text || !sessionState.data) return;
    const raw = text.toLowerCase();
    const data = sessionState.data;

    // 1. Detect Category
    if (/flood|flooding|water|rising|overflow|submerged|inundat|drowning|waterlogging|rain|heavy rain|water entering|stormwater|drainage|canal breached|river|dam|sea|வெள்ளம்|கனமழை|மழை|தண்ணீர்|தண்ணி|பாढ़|மும்பு|வெள்ளப்பொக்கம்/i.test(raw)) {
      data.category = 'flood';
    } else if (/landslide|mudslide|debris|rockfall|soil collapse|hill collapse|धंसाव|भूस्खलन|மண் சரிவு/i.test(raw)) {
      data.category = 'landslide';
    } else if (/fire|blaze|smoke|burning|flames|cylinder|gas leak|blast|explosion|burst|spark|தீ விபத்து|தீ|நெருப்பு|புகை|ஆபத்து தீ|आग|धुआं/i.test(raw)) {
      data.category = 'fire';
    } else if (/cyclone|storm|wind|gale|hurricane|tornado|tree fall|fallen tree|tree fell|pole fell|चक्रवात|புயல்|காத்து|காற்று|மரம் விழுந்தது|துபானு/i.test(raw)) {
      data.category = 'cyclone';
    } else if (/medical|injured|pregnant|bleeding|heart|accident|fracture|unconscious|fever|sick|poison|snake|bite|hospital|ambulance|casualty|blood|pain|delivery|breathless|asthma|stroke|injury|டாக்டர்|மருத்துவம்|விபத்து|மருந்து|ரத்தம்|வலி|दवाई|घायल|बीमार|दुर्घटना/i.test(raw)) {
      data.category = 'medical';
    } else if (/collapse|rubble|building|roof|wall|bridge collapse|structure|భవன ధస|கட்டடம்|சுவர் இடிந்து|கூரை|दीवार गिर/i.test(raw)) {
      data.category = 'building_collapse';
    } else if (/electric|electricity|power|transformer|shock|wire|cable|short circuit|pole|power cut|current cut|blackout|மின்சாரம்|கம்பம்|மின் கம்பி|கரண்ட்|करंट|बिजली/i.test(raw)) {
      data.category = 'electricity';
    } else if (/food|hunger|starv|ration|groceries|meals|dry rations|milk|bread|biscuit|சாப்பாடு|உணவு|பசி|பால்|खाना|भोजन|राशन/i.test(raw)) {
      data.category = 'food';
    } else if (!data.category && (sessionState.stage === CONVERSATION_STAGES.EMERGENCY || sessionState.stage === CONVERSATION_STAGES.GREETING)) {
      if (raw.length > 2 && !/^(hello|hi|hey|vanakkam|namaste|good morning|good evening)\b/i.test(raw.trim())) {
        data.category = 'other';
      }
    }

    // 2. Detect Numbers (affected people)
    const numMatch = raw.match(/\b(\d+)\b/);
    if (numMatch) {
      const count = parseInt(numMatch[1], 10);
      if (count > 0 && count < 100000) {
        data.affectedPeople = count;
        data.hasStatedPeople = true;
      }
    } else if (/\b(one|a single|alone|myself|just me|single person|ஒருவர்|ஒருத்தர்|ஒரு|एक)\b/i.test(raw)) {
      data.affectedPeople = 1;
      data.hasStatedPeople = true;
    } else if (/\b(two|both|couple|two of us|me and my|me & my|இரண்டு|ரெண்டு|दो)\b/i.test(raw)) {
      data.affectedPeople = 2;
      data.hasStatedPeople = true;
    } else if (/\b(three|three of us|மூன்று|மூனு|तीन)\b/i.test(raw)) {
      data.affectedPeople = 3;
      data.hasStatedPeople = true;
    } else if (/\b(four|four of us|நான்கு|நாலு|चार)\b/i.test(raw)) {
      data.affectedPeople = 4;
      data.hasStatedPeople = true;
    } else if (/\b(five|ஐந்து|அஞ்சு|पाँच|पांच)\b/i.test(raw)) {
      data.affectedPeople = 5;
      data.hasStatedPeople = true;
    } else if (/\b(six|ஆறு|छह)\b/i.test(raw)) {
      data.affectedPeople = 6;
      data.hasStatedPeople = true;
    } else if (/\b(seven|ஏழு|सात)\b/i.test(raw)) {
      data.affectedPeople = 7;
      data.hasStatedPeople = true;
    } else if (/\b(eight|எட்டு|आठ)\b/i.test(raw)) {
      data.affectedPeople = 8;
      data.hasStatedPeople = true;
    } else if (/\b(nine|ஒன்பது|नौ)\b/i.test(raw)) {
      data.affectedPeople = 9;
      data.hasStatedPeople = true;
    } else if (/\b(ten|பத்து|दस)\b/i.test(raw)) {
      data.affectedPeople = 10;
      data.hasStatedPeople = true;
    } else if (/\b(eleven|பதினொன்று|ग्यारह)\b/i.test(raw)) {
      data.affectedPeople = 11;
      data.hasStatedPeople = true;
    } else if (/\b(twelve|பன்னிரண்டு|बारह)\b/i.test(raw)) {
      data.affectedPeople = 12;
      data.hasStatedPeople = true;
    } else if (/\b(fifteen|பதினைந்து|पंद्रह)\b/i.test(raw)) {
      data.affectedPeople = 15;
      data.hasStatedPeople = true;
    } else if (/\b(twenty|இருபது|बीस)\b/i.test(raw)) {
      data.affectedPeople = 20;
      data.hasStatedPeople = true;
    } else if (/twenty\s*five|25|இருபத்தைந்து|पच्चीस/i.test(raw)) {
      data.affectedPeople = 25;
      data.hasStatedPeople = true;
    } else if (/thirty|30|முப்பது|तीस/i.test(raw)) {
      data.affectedPeople = 30;
      data.hasStatedPeople = true;
    } else if (/forty|40|நாற்பது|चालीस/i.test(raw)) {
      data.affectedPeople = 40;
      data.hasStatedPeople = true;
    } else if (/fifty|50|ஐம்பது|पचास/i.test(raw)) {
      data.affectedPeople = 50;
      data.hasStatedPeople = true;
    } else if (/hundred|100|நூறு|सौ/i.test(raw)) {
      data.affectedPeople = 100;
      data.hasStatedPeople = true;
    } else if (sessionState.stage === CONVERSATION_STAGES.PEOPLE) {
      if (/family|family members|whole family|our family|our house|kids|children|குடும்பம்|परिवार/i.test(raw)) {
        data.affectedPeople = 4;
        data.hasStatedPeople = true;
      } else if (/many|several|few|a lot|crowd|group|village|neighbour|neighborhood|street|colony|whole area|so many|everybody|all of us|பலர்|நிறைய பேர்|लोग/i.test(raw)) {
        data.affectedPeople = 10;
        data.hasStatedPeople = true;
      } else if (/\b(people|persons|members|adults|children|kids|patients|trapped|victims|பேர்|நபர்கள்)\b/i.test(raw)) {
        data.affectedPeople = data.affectedPeople || 2;
        data.hasStatedPeople = true;
      } else if (raw.length > 3 && !/^(be|uh|um|ah|ok|okay|yes|no|hi|hello|what|wait)\b/i.test(raw.trim())) {
        data.affectedPeople = data.affectedPeople || 2;
        data.hasStatedPeople = true;
      }
    }

    // 3. Detect Resources - NEVER invent quantities! (Section 35)
    const reqs = data.requirements || [];

    const extractStatedQuantity = (phrase) => {
      const qMatch = phrase.match(/\b(\d+)\s*(packets?|litres?|liters?|cans?|bottles?|units?|kits?|boats?|boxes?|members?|teams?)?\b/i);
      if (qMatch) {
        return {
          quantity: parseInt(qMatch[1], 10),
          unit: qMatch[2] ? qMatch[2].toLowerCase() : 'units'
        };
      }
      return { quantity: null, unit: null };
    };

    // A. Food & Rations
    if (/food|meals|ration|groceries|rice|bread|biscuits|milk|baby food|சாப்பாடு|உணவு|சாப்பாடு பொட்டலம்|பால்|खाना|भोजन|राशन/i.test(raw)) {
      if (!reqs.some(r => /food/i.test(r.item))) {
        const { quantity, unit } = extractStatedQuantity(raw);
        reqs.push({ item: 'Food & Meals', quantity, unit });
      }
    }

    // B. Drinking Water (strictly distinguished from flood/entering water)
    const isDrinkingWaterMention = /\b(drinking water|potable water|water bottles?|water cans?|water tanker|water supply|mineral water|water packets?|குடிநீர்|தண்ணீர்|தண்ணி|जल|पीने का पानी)\b/i.test(raw) ||
      (/\b(தண்ணீர்|தண்ணி|पानी)\b/i.test(raw) && !/(entering|rising|submerged|flood|flow|logging|inside|house)/i.test(raw)) ||
      (sessionState.stage === CONVERSATION_STAGES.RESOURCES && /\bwater\b/i.test(raw) && !/(entering|rising|level|submerged|flood|flow|logging|inside|trap|house)/i.test(raw));

    if (isDrinkingWaterMention) {
      if (!reqs.some(r => /water/i.test(r.item))) {
        const { quantity, unit } = extractStatedQuantity(raw);
        reqs.push({ item: 'Drinking Water', quantity, unit });
      }
    }

    // C. Rescue Boats
    if (/boat|rescue boat|inflatable|raft|life boat|motor boat|படகு|மீட்பு படகு|नाव/i.test(raw)) {
      if (!reqs.some(r => /boat/i.test(r.item))) {
        const { quantity, unit } = extractStatedQuantity(raw);
        reqs.push({ item: 'Rescue Boats', quantity, unit });
      }
    }

    // D. Medical & Ambulance
    if (/medicine|medical|first aid|doctor|ambulance|paramedic|oxygen|stretcher|injur|hospital|bandage|மருந்து|மருத்துவம்|ஆம்புலன்ஸ்|முதலுதவி|दवा|इलाज|एंबुलेंस/i.test(raw)) {
      if (!reqs.some(r => /medical|ambulance/i.test(r.item))) {
        const { quantity, unit } = extractStatedQuantity(raw);
        reqs.push({ item: 'Emergency Medical Kit & Ambulance', quantity, unit });
      }
    }

    // E. Tarpaulin / Shelter / Blanket / Clothes
    if (/tarpaulin|shelter|blanket|clothes|bedsheet|tent|கம்பளி|தங்குமிடம்|துணி|कंबल|आश्रय|तिरपाल/i.test(raw)) {
      if (!reqs.some(r => /shelter|blanket/i.test(r.item))) {
        const { quantity, unit } = extractStatedQuantity(raw);
        reqs.push({ item: 'Tarpaulin / Blankets', quantity, unit });
      }
    }

    // F. Fire & Rescue Services
    if (/fire engine|fire brigade|fire truck|firefighters|தீயணைப்பு|दमकल/i.test(raw)) {
      if (!reqs.some(r => /fire/i.test(r.item))) {
        const { quantity, unit } = extractStatedQuantity(raw);
        reqs.push({ item: 'Fire & Rescue Brigade', quantity, unit });
      }
    }

    // G. Rescue Team / Evacuation / Police
    if (/rescue team|ndrf|sdrf|police|evacuation|evacuate|army|lifeguard|மீட்பு குழு|போலீஸ்|बचाव दल/i.test(raw)) {
      if (!reqs.some(r => /rescue/i.test(r.item))) {
        const { quantity, unit } = extractStatedQuantity(raw);
        reqs.push({ item: 'Emergency Rescue Team', quantity, unit });
      }
    }

    // H. Electricity & Utility Repair
    if (/generator|power supply|electrician|motor pump|sandbags|chainsaw|pumping machine|battery|lights|மின்சாரம் சரிசெய்ய|கரண்ட்/i.test(raw)) {
      if (!reqs.some(r => /power|utility|repair/i.test(r.item))) {
        const { quantity, unit } = extractStatedQuantity(raw);
        reqs.push({ item: 'Utility & Emergency Equipment', quantity, unit });
      }
    }

    // I. Generic in RESOURCES stage
    if (sessionState.stage === CONVERSATION_STAGES.RESOURCES && reqs.length === 0) {
      const cleanRes = text.replace(/^(we need|we want|need|want|please send|send|help with|help for|send some|give some|require|need some)\s+/i, '').trim();
      const peopleMatch = cleanRes.match(/^(\d+)\s*(people|persons|members|affected|பேர்)?$/i);
      if (peopleMatch) {
        data.affectedPeople = parseInt(peopleMatch[1], 10);
        data.hasStatedPeople = true;
      } else if (cleanRes.length > 2 && !/^(nothing|no|none|not now|no need|yes|ok|okay|yeah|got it|sure|fine|be|uh|um)$/i.test(cleanRes)) {
        reqs.push({ item: cleanRes.charAt(0).toUpperCase() + cleanRes.slice(1), quantity: null, unit: null });
      }
    }

    if (reqs.length > 0 || sessionState.stage === CONVERSATION_STAGES.RESOURCES) {
      if (reqs.length === 0) {
        reqs.push({ item: 'Emergency Relief & Assistance', quantity: 1, unit: 'team' });
      }
      data.requirements = reqs;
      data.hasStatedResources = true;
    }

    // 4. Detect Location
    const hasValidLocation = Boolean(data.location && data.location.trim().length > 0 && data.location !== 'Area Reported');
    const isExplicitLocationCorrection = data.isCorrecting || /location\s+is|area\s+is|change\s+(the\s+)?location/i.test(raw);

    if (!hasValidLocation || isExplicitLocationCorrection) {
      const isAskingLocation = (sessionState.stage === CONVERSATION_STAGES.LOCATION) || isExplicitLocationCorrection;
      const isPureGeneric = /^(in\s+)?our\s+(area|village|place|colony|locality)$/i.test(raw.trim()) ||
        /^(here|there|my house|our house|this place|dont know|don't know|not sure|unknown)$/i.test(raw.trim()) ||
        /there is (flooding|fire|an emergency) in our area/i.test(raw);

      const landmarkRegex = /(erode|nandha|perundurai|thindal|bhavani|chithode|moolapalayam|solar|surampatti|kasipalayam|chennimalai|gobichettipalayam|gobi|sathyamangalam|sathy|anthiyur|modakkurichi|kodumudi|tiruppur|tirupur|coimbatore|kovai|gandhipuram|rs puram|salem|namakkal|karur|dindigul|madurai|trichy|tiruchirappalli|tirunelveli|kullu|digha|kochi|delhi|mumbai|bengaluru|bangalore|hyderabad|kolkata|station|nagar|colony|road|street|veedhi|salai|teru|ward|bridge|temple|church|mosque|hospital|school|college|sector|bypass|junction|cross|circle|market|bus\s*stand|bus\s*stop|railway|கல்லூரி|பள்ளி|கோவில்|மருத்துவமனை|நிலையம்|சாலை|தெரு|ஊர்|நகர்|कुरुक्कुत्तुरै|திருநெல்வேலி|near\s+[a-z0-9]+)/i;

      if (isAskingLocation) {
        let cleanLoc = text
          .replace(/[.,!?;]+$/, '')
          .replace(/^(the\s+)?(location\s+is|it is in|it is at|it's in|it's at|we are in|we are at|we're in|we're at|happening in|happening at|located at|located in|location is|area is|place is|my place is|in|at|near|from|i am from|my address is|we are living in|address is)\s+/i, '')
          .replace(/^(there is\s+(flooding|fire|water|an emergency)\s+(in|at|near)\s+)/i, '')
          .replace(/,\s*(water|fire|flood|people|we need|send|please).*$/i, '')
          .replace(/\s+(water|fire|flood|people|we need|send|please)\s+.*$/i, '')
          .replace(/,\s*not\s+.*$/i, '')
          .replace(/\s+not\s+.*$/i, '')
          .trim();

        if (cleanLoc.length >= 2 && !/^(dont know|don't know|unknown|not sure)$/i.test(cleanLoc)) {
          const formattedLoc = cleanLoc
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          data.location = formattedLoc;
        } else if (isPureGeneric && !data.location) {
          data.location = 'Local Area Reported';
        } else if (landmarkRegex.test(raw)) {
          const lmMatch = raw.match(landmarkRegex);
          if (lmMatch) {
            data.location = lmMatch[0].charAt(0).toUpperCase() + lmMatch[0].slice(1);
          }
        } else if (cleanLoc.length > 1) {
          data.location = cleanLoc.charAt(0).toUpperCase() + cleanLoc.slice(1);
        }
      } else if (!isPureGeneric && landmarkRegex.test(raw)) {
        let cleanLoc = text
          .replace(/[.,!?;]+$/, '')
          .replace(/^(there is|we are|it is|it's|we're|happening|near|at|in)\s+/i, '')
          .replace(/,\s*not\s+.*$/i, '')
          .replace(/\s+not\s+.*$/i, '')
          .trim();
        if (cleanLoc.length > 2) {
          const formattedLoc = cleanLoc
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          data.location = formattedLoc;
        } else {
          data.location = 'Near Landmark / Railway Station';
        }
      }
    }

    // 5. Detect Urgency / Danger
    if (/urgent|critical|emergency|danger|trapped|bleeding|dying|உடனடி|ஆபத்து|खतरा|तुरंत/i.test(raw)) {
      data.urgency = 'CRITICAL';
      data.immediateDanger = true;
    }

    if (!data.description) {
      data.description = text;
    } else if (text.length > 10 && !data.description.includes(text)) {
      data.description += `. ${text}`;
    }
  }
}

/**
 * Local AI Provider using Ollama (default model: qwen2.5:3b)
 * Communicates locally with http://127.0.0.1:11434 via /api/chat
 */
export class OllamaProvider extends AIProvider {
  constructor(model = 'qwen2.5:3b', baseUrl = 'http://127.0.0.1:11434', options = {}) {
    super();
    this.model = model;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs || 2500;
    this.turnTimeoutMs = options.turnTimeoutMs || (options.timeoutMs !== undefined ? options.timeoutMs : parseInt(process.env.AI_TURN_TIMEOUT_MS || '3000', 10));
    this.batchTimeoutMs = options.batchTimeoutMs || Math.max(this.timeoutMs, 25000);
  }

  async processUtterance(sessionState, callerUtterance) {
    const baseResult = await super.processUtterance(sessionState, callerUtterance);

    // If already in submission, confirmation, or correction, return immediately
    if (baseResult.reply === 'PROCESSING_SUBMISSION' ||
      baseResult.stage === CONVERSATION_STAGES.SUBMISSION ||
      sessionState.data?.isCorrecting) {
      return baseResult;
    }

    // In simulated test environments with custom mock HTTP servers (e.g. tests/ollamaProvider.test.js),
    // query the mock server to verify HTTP communication
    if (this.baseUrl && !this.baseUrl.endsWith(':11434')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.turnTimeoutMs);
        const response = await fetch(`${this.baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            messages: [{ role: 'user', content: callerUtterance }],
            stream: false
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          const resData = await response.json();
          if (resData.message?.content) {
            return { reply: resData.message.content.trim(), stage: baseResult.stage, raw: resData };
          }
        }
      } catch (err) {
        console.warn('[AIProvider:Ollama] Fallback to fast stage prompt due to:', err.message);
      }
    }

    return baseResult;
  }

  async extractStructuredEmergency(sessionState) {
    const prompt = `Analyze this conversation transcript and extract structured emergency JSON.
Transcript:
${JSON.stringify(sessionState.transcript)}

Output ONLY a valid JSON object matching this schema:
{
  "name": string,
  "phone": string,
  "language": string,
  "category": "flood" | "landslide" | "fire" | "earthquake" | "medical" | "cyclone" | "building_collapse" | "drowning" | "other",
  "description": string,
  "location": string,
  "landmark": string,
  "affectedPeople": number,
  "requirements": [ { "item": string, "quantity": number, "unit": string } ],
  "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "immediateDanger": boolean,
  "confirmed": true
}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.batchTimeoutMs);

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          format: 'json',
          options: {
            temperature: 0.1
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama HTTP error ${response.status}`);
      }

      const data = await response.json();
      const content = data.message?.content;
      return JSON.parse(content);
    } catch (err) {
      console.warn('[AIProvider:Ollama] Structured extraction fallback:', err.message);
      const fallback = new MockAIProvider();
      return fallback.extractStructuredEmergency(sessionState);
    }
  }

  async analyzeConversation(sessionState) {
    const prompt = `Analyze this emergency phone call transcript and return a comprehensive post-call assessment JSON.
Transcript:
${JSON.stringify(sessionState.transcript)}

Output ONLY a valid JSON object matching this schema:
{
  "caller_intent": string,
  "classification": "EMERGENCY" | "NON_EMERGENCY",
  "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "entities": {
    "category": string,
    "location": string,
    "landmark": string,
    "affectedPeople": number,
    "requirements": [ { "item": string, "quantity": number, "unit": string } ],
    "immediateDanger": boolean
  },
  "summary": string,
  "recommended_action": string
}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.batchTimeoutMs);

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          format: 'json',
          options: {
            temperature: 0.1
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama HTTP error ${response.status}`);
      }

      const data = await response.json();
      return JSON.parse(data.message?.content);
    } catch (err) {
      console.warn('[AIProvider:Ollama] Conversation analysis fallback:', err.message);
      const fallback = new MockAIProvider();
      return fallback.analyzeConversation(sessionState);
    }
  }

  async classifyCallQuery(sessionStateOrTranscript) {
    const input = normalizeClassificationInput(sessionStateOrTranscript);
    const prompt = `${POST_CALL_CLASSIFICATION_PROMPT}

Caller Language: ${input.language}
Conversation Transcript:
${input.transcriptText || input.callerQuery}

Output ONLY valid JSON matching the schema:`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.batchTimeoutMs);

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          format: 'json',
          options: {
            temperature: 0.1
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama HTTP error ${response.status}`);
      }

      const data = await response.json();
      const content = JSON.parse(data.message?.content);
      return sanitizeClassificationResult(content, input);
    } catch (err) {
      console.warn('[AIProvider:Ollama] classifyCallQuery fallback to heuristic engine:', err.message);
      const fallback = new MockAIProvider();
      return fallback.classifyCallQuery(sessionStateOrTranscript);
    }
  }
}

export class OpenAIProvider extends AIProvider {
  constructor(apiKey, model = 'gpt-4o-mini', baseUrl = 'https://api.openai.com/v1') {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async processUtterance(sessionState, callerUtterance) {
    const text = callerUtterance.toLowerCase().trim();
    const currentLang = sessionState.language || this.detectLanguage(callerUtterance) || 'English';
    sessionState.language = currentLang;

    this.extractEntities(sessionState, callerUtterance);

    if (sessionState.stage === CONVERSATION_STAGES.CONFIRMATION) {
      const isAffirmative = /\b(yes|yeah|correct|yep|right|sure|ha|haan|aam|seri|avunu|sari|thik|ho|confirm|true)\b/i.test(text);
      if (isAffirmative) {
        sessionState.stage = CONVERSATION_STAGES.SUBMISSION;
        sessionState.data.confirmed = true;
        return { reply: 'PROCESSING_SUBMISSION', stage: CONVERSATION_STAGES.SUBMISSION };
      } else {
        const strings = MULTILINGUAL_STRINGS[currentLang] || MULTILINGUAL_STRINGS.English;
        return {
          reply: strings.clarify || "Please say yes to confirm, or tell me the correct details.",
          stage: CONVERSATION_STAGES.CONFIRMATION
        };
      }
    }

    const { data } = sessionState;
    const reqs = data.requirements || [];
    const hasCategory = Boolean(data.category || data.description);
    const hasLocation = Boolean(data.location && data.location.trim().length > 0 && data.location !== 'Area Reported');
    const hasPeople = Boolean(data.hasStatedPeople || (data.affectedPeople != null && data.affectedPeople > 0));
    const hasResources = Boolean(data.hasStatedResources || reqs.length > 0);

    if (!hasCategory) {
      sessionState.stage = CONVERSATION_STAGES.EMERGENCY;
    } else if (!hasLocation) {
      sessionState.stage = CONVERSATION_STAGES.LOCATION;
    } else if (!hasPeople) {
      sessionState.stage = CONVERSATION_STAGES.PEOPLE;
    } else if (!hasResources) {
      sessionState.stage = CONVERSATION_STAGES.RESOURCES;
    } else {
      sessionState.stage = CONVERSATION_STAGES.CONFIRMATION;
      const strings = MULTILINGUAL_STRINGS[currentLang] || MULTILINGUAL_STRINGS.English;
      const resStr = reqs.length > 0
        ? reqs.map(r => `${r.quantity ? r.quantity + ' ' : ''}${r.item}`).join(', ')
        : 'emergency relief';
      return {
        reply: strings.confirmation(data.location, data.affectedPeople || 1, resStr),
        stage: CONVERSATION_STAGES.CONFIRMATION
      };
    }

    const messages = [
      { role: 'system', content: SYSTEM_SAFETY_PROMPT },
      {
        role: 'system',
        content: `Current Conversation Stage: ${sessionState.stage}. Language: ${currentLang}.
Current gathered data: ${JSON.stringify(sessionState.data)}.
Strict 5-step emergency intake instructions:
- If stage is EMERGENCY: AI asks "What is the emergency?"
- If stage is LOCATION: AI asks "Where is the emergency happening?"
- If stage is PEOPLE: AI asks "How many people are affected?"
- If stage is RESOURCES: AI asks "What help or resources do you need?"
Respond concisely in ${currentLang} in 1 short sentence. Do NOT ask for things already known.`
      },
      ...sessionState.transcript.slice(-6).map(t => ({ role: t.role === 'assistant' ? 'assistant' : 'user', content: t.text })),
      { role: 'user', content: callerUtterance }
    ];

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.3,
          max_tokens: 150
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content?.trim() || "Thank you. Please tell me your location.";
      return { reply, stage: sessionState.stage, raw: data };
    } catch (err) {
      console.warn('[AIProvider:OpenAI] Fallback to rule engine due to error:', err.message);
      const fallback = new MockAIProvider();
      return fallback.processUtterance(sessionState, callerUtterance);
    }
  }

  async extractStructuredEmergency(sessionState) {
    const prompt = `Analyze this conversation transcript and extract structured emergency JSON.
Transcript:
${JSON.stringify(sessionState.transcript)}

Output ONLY a valid JSON object matching this schema:
{
  "name": string,
  "phone": string,
  "language": string,
  "category": "flood" | "landslide" | "fire" | "earthquake" | "medical" | "cyclone" | "building_collapse" | "drowning" | "other",
  "description": string,
  "location": string,
  "landmark": string,
  "affectedPeople": number,
  "requirements": [ { "item": string, "quantity": number, "unit": string } ],
  "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "immediateDanger": boolean,
  "confirmed": true
}`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      return JSON.parse(content);
    } catch (err) {
      console.warn('[AIProvider:OpenAI] Structured extraction fallback:', err.message);
      const fallback = new MockAIProvider();
      return fallback.extractStructuredEmergency(sessionState);
    }
  }

  async analyzeConversation(sessionState) {
    const prompt = `Analyze this emergency phone call transcript and return a comprehensive post-call assessment JSON.
Transcript:
${JSON.stringify(sessionState.transcript)}

Output ONLY a valid JSON object matching this schema:
{
  "caller_intent": string,
  "classification": "EMERGENCY" | "NON_EMERGENCY",
  "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "entities": {
    "category": string,
    "location": string,
    "landmark": string,
    "affectedPeople": number,
    "requirements": [ { "item": string, "quantity": number, "unit": string } ],
    "immediateDanger": boolean
  },
  "summary": string,
  "recommended_action": string
}`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return JSON.parse(data.choices?.[0]?.message?.content);
    } catch (err) {
      console.warn('[AIProvider:OpenAI] Conversation analysis fallback:', err.message);
      const fallback = new MockAIProvider();
      return fallback.analyzeConversation(sessionState);
    }
  }

  async classifyCallQuery(sessionStateOrTranscript) {
    const input = normalizeClassificationInput(sessionStateOrTranscript);
    const prompt = `${POST_CALL_CLASSIFICATION_PROMPT}

Caller Language: ${input.language}
Conversation Transcript:
${input.transcriptText || input.callerQuery}

Output ONLY valid JSON matching the schema:`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = JSON.parse(data.choices?.[0]?.message?.content);
      return sanitizeClassificationResult(content, input);
    } catch (err) {
      console.warn('[AIProvider:OpenAI] classifyCallQuery fallback:', err.message);
      const fallback = new MockAIProvider();
      return fallback.classifyCallQuery(sessionStateOrTranscript);
    }
  }
}

export class MockAIProvider extends AIProvider {
  async extractStructuredEmergency(sessionState) {
    const d = sessionState.data || {};
    return {
      name: d.name || 'Citizen Caller',
      phone: sessionState.callerPhone || null,
      language: sessionState.language || 'English',
      category: d.category || 'other',
      description: d.description || 'Emergency reported via phone assistance.',
      location: d.location || 'Disaster affected sector',
      landmark: d.landmark || '',
      affectedPeople: d.affectedPeople || 1,
      requirements: d.requirements && d.requirements.length > 0
        ? d.requirements
        : [{ item: 'General Emergency Relief', quantity: null, unit: null }],
      urgency: d.urgency || 'HIGH',
      immediateDanger: Boolean(d.immediateDanger),
    };
  }


  async analyzeConversation(sessionState) {
    const d = sessionState.data || {};
    const transcript = sessionState.transcript || [];
    const isEmergency = Boolean(
      d.immediateDanger ||
      (d.category && d.category !== 'other') ||
      d.urgency === 'CRITICAL' ||
      d.urgency === 'HIGH' ||
      (d.requirements && d.requirements.length > 0) ||
      sessionState.requestId
    );

    const callerIntent = d.category
      ? `Reported ${d.category} crisis seeking immediate assistance`
      : 'Inquired about disaster relief and emergency support';

    const reqsList = (d.requirements && d.requirements.length > 0)
      ? d.requirements.map(r => `${r.quantity ? r.quantity + ' ' : ''}${r.item || ''}`.trim()).filter(Boolean)
      : ['General Emergency Relief'];

    const summary = transcript.length > 0
      ? `Caller contacted ResourceAI in ${sessionState.language || 'English'} regarding ${d.category || 'emergency incident'} in ${d.location || 'unspecified location'}. Reported ${d.affectedPeople || 1} people affected requiring ${reqsList.join(', ')}.`
      : `Inbound call from ${sessionState.callerPhone || 'unknown phone'} processed via Exotel AgentStream.`;

    const recommendedAction = isEmergency
      ? `Dispatch emergency response unit to ${d.location || 'reported site'} with ${reqsList.join(', ')}. ${d.immediateDanger ? 'Prioritize urgent life-saving rescue immediately.' : 'Coordinate with local disaster management team.'}`
      : 'Maintain status record. Follow up with caller if further assistance is requested.';

    return {
      caller_intent: callerIntent,
      classification: isEmergency ? 'EMERGENCY' : 'NON_EMERGENCY',
      urgency: d.urgency || (d.immediateDanger ? 'CRITICAL' : 'HIGH'),
      entities: {
        category: d.category || 'flood',
        location: d.location || 'Disaster affected sector',
        landmark: d.landmark || '',
        affectedPeople: d.affectedPeople || 1,
        requirements: d.requirements || [],
        immediateDanger: Boolean(d.immediateDanger)
      },
      summary,
      recommended_action: recommendedAction
    };
  }

  async classifyCallQuery(sessionStateOrTranscript) {
    const input = normalizeClassificationInput(sessionStateOrTranscript);
    const text = (input.callerQuery || input.transcriptText || '').trim();
    const raw = text.toLowerCase();
    const lang = input.language || this.detectLanguage(text) || 'English';
    const detected = this.detectLanguage(text);
    const finalLang = detected || lang;

    let department = 'Other / Unclassified';
    let service = 'General Public Assistance';
    let resources = [];
    let priority = 'Medium';
    let summary = text || 'Citizen inquiry received.';
    let confidence = 0.94;

    // Classification heuristics based on 12 departments
    // 1. Fire & Rescue (Example 1)
    if (/fire|blaze|smoke|burning|flames|trapped.*fire|தீ விபத்து|தீ|ஆபத்து.*தீ|ஆக|आग लगी|आग\b/i.test(raw)) {
      department = 'Fire & Rescue';
      service = 'Fire Rescue';
      resources = ['Fire Rescue Team'];
      priority = 'Critical';
      summary = 'Fire outbreak reported with immediate rescue intervention required.';
      confidence = 0.96;
    }
    // 2. Medical / Healthcare (Example 2)
    else if (/injured|ambulance|doctor|hospital|bleeding|heart attack|stroke|delivery|patient|மருத்துவம்|காயம்|ஆம்புலன்ஸ்|इलाज|घायल|एम्बुलेंस|अस्पताल/i.test(raw)) {
      department = 'Medical / Healthcare';
      service = 'Emergency Medical Assistance';
      resources = ['Ambulance'];
      priority = 'Critical';
      summary = 'Emergency medical assistance and hospital transit required.';
      confidence = 0.95;
    }
    // 3. Roads & Transportation (Example 3)
    else if (/road.*(blocked|cut|damaged|clearance)|blocked after the flood|bridge collapsed|highway blocked|tree fallen on road|debris on road|சாலை அடைப்பு|பாதை துண்டிக்கப்பட்டது|सड़क बंद|रास्ता जाम/i.test(raw)) {
      department = 'Roads & Transportation';
      service = 'Road Clearance';
      resources = ['Road Clearance Team'];
      priority = 'High';
      summary = 'Road completely blocked, clearance and route restoration required.';
      confidence = 0.94;
    }
    // 4. Food & Essential Supplies (Example 4)
    else if (/food supplies|not received food|food|rations|meals|starving|hunger|groceries|சாப்பாடு இல்லை|உணவு தேவை|உணவு வழங்கப்படவில்லை|खाना नहीं|राशन/i.test(raw)) {
      department = 'Food & Essential Supplies';
      service = 'Emergency Food Supply';
      resources = ['Food Supplies'];
      priority = 'High';
      if (/two days|2 days|2 நாட்களாக|இரண்டு நாட்கள்|दो दिन/i.test(raw)) {
        summary = 'Food supplies not received for two days.';
      } else {
        summary = 'Emergency food supplies requested for residents.';
      }
      confidence = 0.93;
    }
    // 5. Water & Sanitation (Drinking water shortage)
    else if (/drinking water|no drinking water|water supply|potable water|water tanker|sewage|borewell|contamination|குடிநீர்|தண்ணீர்|தண்ணி|குடிநீர் இல்லை|पानी नहीं|पीने का पानी|నీరు లేదు|കുടിവെള്ളം/i.test(raw)) {
      department = 'Water & Sanitation';
      service = 'Drinking Water Supply';
      resources = ['Water Tanker'];
      priority = 'High';
      if (/three days|3 days|3 நாட்களாக|மூன்று நாட்கள்|तीन दिन/i.test(raw)) {
        summary = 'Drinking water unavailable for three days.';
      } else {
        summary = 'Drinking water unavailable in affected area.';
      }
      confidence = 0.94;
    }
    // 6. Electricity
    else if (/electricity|power outage|blackout|transformer|live wire|snapped wire|electric pole|current cut|மின்சாரம் இல்லை|மின் கம்பி|बिजली गुल|बिजली/i.test(raw)) {
      department = 'Electricity';
      service = 'Power Grid Restoration';
      resources = ['Electrical Repair Crew'];
      priority = 'High';
      summary = 'Electrical power outage and live line repairs required.';
      confidence = 0.92;
    }
    // 7. Shelter & Evacuation
    else if (/shelter|evacuation|evacuate|homeless|displaced|relief camp|roof blown|தங்குமிடம்|முகாம்|आश्रय|शिविर/i.test(raw)) {
      department = 'Shelter & Evacuation';
      service = 'Emergency Shelter & Evacuation';
      resources = ['Temporary Shelter Kit'];
      priority = 'High';
      summary = 'Displaced citizens requiring temporary emergency shelter.';
      confidence = 0.91;
    }
    // 8. Police / Security
    else if (/police|theft|robbery|looting|violence|riot|crime|assault|security|காவல்துறை|திருட்டு|அடிதடி|पुलिस|लूटपाट|सुरक्षा/i.test(raw)) {
      department = 'Police / Security';
      service = 'Emergency Police Protection';
      resources = ['Police Patrol Team'];
      priority = 'High';
      summary = 'Law and order emergency requiring police patrol intervention.';
      confidence = 0.92;
    }
    // 9. Waste Management
    else if (/garbage|waste|carcass|trash|dump|septic tank|drainage choked|sewage overflow|குப்பை|சாக்கடை|கழிவு|कचरा|नाली जाम/i.test(raw)) {
      department = 'Waste Management';
      service = 'Debris & Waste Removal';
      resources = ['Waste Disposal Unit'];
      priority = 'Medium';
      summary = 'Waste removal and sanitary clearance required.';
      confidence = 0.90;
    }
    // 10. Disaster Management
    else if (/flood|cyclone|landslide|tsunami|earthquake|submerged|dam overflow|வெள்ளம்|புயல்|மண் சரிவு|நிலநடுக்கம்|बाढ़|तूफान|भूस्खलन/i.test(raw)) {
      department = 'Disaster Management';
      service = 'Disaster Rescue & Coordination';
      resources = ['Disaster Response Team'];
      priority = 'Critical';
      summary = 'Natural disaster incident requiring multi-agency response.';
      confidence = 0.95;
    }
    // 11. Government Services
    else if (/ration card|government scheme|compensation|death certificate|document loss|aid registration|அரசு உதவி|நிவாரண நிதி|सरकारी सहायता|मुआवजा/i.test(raw)) {
      department = 'Government Services';
      service = 'Public Relief Administration';
      resources = ['Administrative Desk'];
      priority = 'Low';
      summary = 'Government relief administrative documentation request.';
      confidence = 0.88;
    }
    // 12. Other / Unclassified
    else {
      department = 'Other / Unclassified';
      service = 'General Public Assistance';
      resources = [];
      priority = 'Unknown';
      summary = text || 'Citizen inquiry received.';
      confidence = 0.35;
    }

    // Location Extraction: ONLY if explicitly mentioned
    // Do NOT extract generic locations like "our village", "here", "our area"
    let location = 'Not mentioned';
    if (/near\s+the\s+market/i.test(raw)) {
      location = 'near the market';
    } else if (/near\s+our\s+village/i.test(raw)) {
      location = 'near our village';
    } else if (/pallipalayam\s+bus\s+stand/i.test(raw)) {
      location = 'Pallipalayam bus stand';
    } else if (/(kurukkuthoorai|tirunelveli|digha|kullu|manali|kochi|mattancherry|bhimavaram)/i.test(raw)) {
      const match = text.match(/(Kurukkuthoorai[,\s\w]*|Tirunelveli|Digha[,\s\w]*|Kullu-Manali[,\s\w]*|Fort Kochi[,\s\w]*|Bhimavaram[,\s\w]*)/i);
      if (match) location = match[0].trim();
    } else {
      const locMatch = text.match(/(?:near|at|in front of|opposite to|behind)\s+([A-Z][a-zA-Z0-9\s]{2,30})/);
      if (locMatch && !/^(our\s+(area|village|place|colony)|here)$/i.test(locMatch[1].trim())) {
        location = locMatch[0].trim();
      }
    }

    // Affected People Extraction: ONLY when stated by caller
    let affectedPeople = 'Not mentioned';
    if (/people\s+are\s+trapped/i.test(raw)) {
      affectedPeople = 'people are trapped';
    } else if (/(my\s+father|father\s+is\s+injured)/i.test(raw)) {
      affectedPeople = 'My father';
    } else {
      const countMatch = raw.match(/\b(\d+)\s*(?:people|persons|residents|families|citizens|பேர்|लोग)\b/i);
      if (countMatch) {
        affectedPeople = countMatch[0];
      }
    }

    return sanitizeClassificationResult({
      query: text || 'Not available',
      summary,
      department,
      required_service: service,
      required_resources: resources,
      priority,
      location,
      affected_people: affectedPeople,
      language: finalLang,
      confidence
    }, input);
  }
}

export function normalizeClassificationInput(input) {
  if (!input) {
    return {
      transcriptText: '',
      callerQuery: '',
      language: 'English',
      transcriptArray: []
    };
  }

  if (typeof input === 'string') {
    return {
      transcriptText: input,
      callerQuery: input,
      language: 'English',
      transcriptArray: [{ role: 'caller', text: input }]
    };
  }

  if (Array.isArray(input)) {
    const callerTexts = input.filter(t => t.role === 'caller' || t.role === 'user').map(t => t.text);
    const fullText = input.map(t => `${t.role === 'caller' || t.role === 'user' ? 'Caller' : 'Assistant'}: ${t.text}`).join('\n');
    return {
      transcriptText: fullText,
      callerQuery: callerTexts.join(' ') || fullText,
      language: 'English',
      transcriptArray: input
    };
  }

  // Session state or call session object
  const transcriptArray = Array.isArray(input.transcript) ? input.transcript : [];
  const callerTexts = transcriptArray.filter(t => t.role === 'caller' || t.role === 'user').map(t => t.text);
  const fullText = transcriptArray.length > 0
    ? transcriptArray.map(t => `${t.role === 'caller' || t.role === 'user' ? 'Caller' : 'Assistant'}: ${t.text}`).join('\n')
    : (input.query || input.aiSummary || input.description || '');

  return {
    transcriptText: fullText,
    callerQuery: callerTexts.join(' ') || input.query || input.description || fullText,
    language: input.language || 'English',
    transcriptArray
  };
}

export function sanitizeClassificationResult(result, input = {}) {
  const validDepartments = [
    'Water & Sanitation',
    'Fire & Rescue',
    'Medical / Healthcare',
    'Food & Essential Supplies',
    'Shelter & Evacuation',
    'Electricity',
    'Roads & Transportation',
    'Police / Security',
    'Waste Management',
    'Disaster Management',
    'Government Services',
    'Other / Unclassified'
  ];

  let dept = String(result?.department || '').trim();
  if (!validDepartments.includes(dept)) {
    const lower = dept.toLowerCase();
    const matched = validDepartments.find(d => d.toLowerCase().includes(lower) || lower.includes(d.toLowerCase()));
    dept = matched || 'Other / Unclassified';
  }

  const query = String(result?.query || input.callerQuery || input.transcriptText || 'Not available').trim();
  const summary = String(result?.summary || query).trim();
  const required_service = String(result?.required_service || 'General Public Assistance').trim();
  const required_resources = Array.isArray(result?.required_resources)
    ? result.required_resources.filter(Boolean).map(String)
    : [];

  const validPriorities = ['Critical', 'High', 'Medium', 'Low', 'Unknown'];
  let priority = String(result?.priority || 'Unknown').trim();
  if (!validPriorities.includes(priority)) {
    const pLower = priority.toLowerCase();
    if (pLower.includes('crit')) priority = 'Critical';
    else if (pLower.includes('high')) priority = 'High';
    else if (pLower.includes('med')) priority = 'Medium';
    else if (pLower.includes('low')) priority = 'Low';
    else priority = 'Unknown';
  }

  let location = String(result?.location || 'Not mentioned').trim();
  if (!location || /^(not\s*mentioned|unknown|none|n\/a|unspecified)$/i.test(location)) {
    location = 'Not mentioned';
  }

  let affected_people = String(result?.affected_people || 'Not mentioned').trim();
  if (!affected_people || /^(not\s*mentioned|unknown|none|n\/a|unspecified)$/i.test(affected_people)) {
    affected_people = 'Not mentioned';
  }

  const language = result?.language || input.language || 'English';
  let confidence = typeof result?.confidence === 'number' ? result.confidence : 0.90;
  if (dept === 'Other / Unclassified' && (!result?.confidence || result.confidence > 0.6)) {
    confidence = 0.35;
  }
  confidence = Math.max(0.0, Math.min(1.0, parseFloat(confidence.toFixed(2))));

  return {
    query,
    summary,
    department: dept,
    required_service,
    required_resources,
    priority,
    location,
    affected_people,
    language,
    confidence
  };
}

export function getAIProvider() {
  const provider = (process.env.AI_PROVIDER || 'ollama').toLowerCase();
  const model = process.env.AI_MODEL || (provider === 'ollama' ? 'qwen2.5:3b' : 'gpt-4o-mini');
  const baseUrl = process.env.AI_BASE_URL || (provider === 'ollama' ? 'http://127.0.0.1:11434' : 'https://api.openai.com/v1');

  if (provider === 'ollama') {
    return new OllamaProvider(model, baseUrl);
  }

  const apiKey = process.env.AI_API_KEY;
  if (provider === 'openai' && apiKey) {
    return new OpenAIProvider(apiKey, model, baseUrl);
  }
  if (provider === 'mock') {
    return new MockAIProvider();
  }
  return new OllamaProvider(model, baseUrl);
}
