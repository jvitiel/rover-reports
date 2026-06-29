// Attribute parser using GPT-4o to extract structured data from transcripts
import { readFileSync } from 'fs';
import OpenAI from 'openai';
import { z } from 'zod';
import { BehaviorNotes, AdopterPreferences, ShelterSecrets } from './types.js';
import { sanitizeBioText } from './utils.js';

const SECRETS_PATH = process.env.SECRETS_PATH || '/home/shelter/.config/shelter-secrets.json';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const secrets: ShelterSecrets = JSON.parse(readFileSync(SECRETS_PATH, 'utf-8'));
    openai = new OpenAI({ apiKey: secrets.openai.apiKey });
  }
  return openai;
}

// Valid match values for compatibility filters
const compatibilityMatchValues = ['yes', 'somewhat', 'no', 'unknown'] as const;
const energyLevelMatchValues = ['low', 'medium', 'high', 'unknown'] as const;

// Zod schemas for validation
const BehaviorNotesSchema = z.object({
  color: z.string().nullable().transform(v => v ?? 'Not specified').describe('Coat color and pattern description'),
  specialFeatures: z.string().nullable().transform(v => v ?? 'Not specified').describe('Special physical features'),
  energyLevel: z.string().nullable().transform(v => v ?? 'Not specified').describe('Energy level description'),
  peopleReaction: z.string().nullable().transform(v => v ?? 'Not specified').describe('How they react to people'),
  
  // Dual storage: rich description (_text) + enum for filtering (_match)
  goodWithCats_text: z.string().nullable().transform(v => v ?? 'Not specified').describe('Rich description for bios'),
  goodWithCats_match: z.enum(compatibilityMatchValues).nullable().transform(v => v ?? 'unknown').describe('Enum for filtering'),
  goodWithDogs_text: z.string().nullable().transform(v => v ?? 'Not specified').describe('Rich description for bios'),
  goodWithDogs_match: z.enum(compatibilityMatchValues).nullable().transform(v => v ?? 'unknown').describe('Enum for filtering'),
  goodWithKids_text: z.string().nullable().transform(v => v ?? 'Not specified').describe('Rich description for bios'),
  goodWithKids_match: z.enum(compatibilityMatchValues).nullable().transform(v => v ?? 'unknown').describe('Enum for filtering'),
  energyLevel_match: z.enum(energyLevelMatchValues).nullable().transform(v => v ?? 'unknown').describe('Enum for filtering'),
  
  // Legacy fields (kept for backward compatibility, will be empty in new records)
  goodWithCats: z.string().nullable().transform(v => v ?? '').optional(),
  goodWithDogs: z.string().nullable().transform(v => v ?? '').optional(),
  goodWithKids: z.string().nullable().transform(v => v ?? '').optional(),
  otherAnimalReaction: z.string().nullable().transform(v => v ?? '').optional(),
  kidBehavior: z.string().nullable().transform(v => v ?? '').optional(),
  
  // Other fields
  specialNeeds: z.string().nullable().transform(v => v ?? 'None').describe('Medical or behavioral special needs'),
  backstory: z.string().nullable().transform(v => v ?? 'Not specified').describe('Animal backstory and history'),
  additionalNotes: z.string().nullable().transform(v => v ?? 'None').describe('Other relevant information'),
});

const AdopterPreferencesSchema = z.object({
  preferredSpecies: z.enum(['dog', 'cat', 'small', 'any']).nullable().transform(v => v ?? 'any').describe('Species preference: dog, cat, small (rabbit/guinea pig/etc), or any'),
  livingSituation: z.string().nullable().transform(v => v ?? 'Not specified').describe('Apartment, house, yard, etc.'),
  householdMembers: z.string().nullable().transform(v => v ?? 'Not specified').describe('Kids, other pets, adults'),
  homeEnergyLevel: z.string().nullable().transform(v => v ?? 'Not specified').describe('Calm, moderate, active household'),
  timeAvailable: z.string().nullable().transform(v => v ?? 'Not specified').describe('Time available for pet care'),
  petExperience: z.string().nullable().transform(v => v ?? 'Not specified').describe('Previous pet ownership experience'),
  preferredTraits: z.string().nullable().transform(v => v ?? 'Not specified').describe('Desired age, size, breed, energy level'),
  openToSpecialNeeds: z.boolean().nullable().transform(v => v ?? false).describe('Willing to adopt special needs animal'),
  locationPreferences: z.string().nullable().transform(v => v ?? 'Not specified').describe('Location or travel constraints'),
  additionalNotes: z.string().nullable().transform(v => v ?? 'Not specified').describe('Any other preferences or requirements'),
});

const BEHAVIOR_EXTRACTION_PROMPT = `You are an expert at extracting structured information about shelter animals from caregiver observations.

Extract the following information from the transcript. If information isn't mentioned, use "Not specified" for text fields.

The transcript is from a shelter caregiver describing an animal's appearance, behavior, and personality.

Return a JSON object with these exact fields:
- color: Coat color and pattern (e.g., "Orange tabby with white chest", "Solid black, short hair", "Calico")
- specialFeatures: Physical features that stand out (e.g., "Bright green eyes", "Crooked tail", "Extra fluffy")
- energyLevel: Energy level description (e.g., "High energy, loves fetch", "Calm lap cat", "Moderate, playful in bursts")
- energyLevel_match: Energy level enum for filtering. MUST be exactly one of: "low", "medium", "high", "unknown"
- peopleReaction: How they react to people (e.g., "Very social and outgoing", "Shy at first but warms up", "Independent")

For compatibility fields, provide BOTH a rich description (_text) and a simple enum (_match):
- goodWithCats_text: Rich description for bios (e.g., "Gets along great, grooms other cats", "Shy with cats, needs slow intro", "Prefers to be only cat")
- goodWithCats_match: Enum for filtering. MUST be exactly one of: "yes", "somewhat", "no", "unknown"
  - "yes" = clearly good with cats
  - "somewhat" = OK with some cats, needs slow intro, conditional
  - "no" = should not live with cats
  - "unknown" = not tested or not mentioned

- goodWithDogs_text: Rich description for bios (e.g., "Loves dogs, plays well", "Fearful, needs slow intro", "Not dog-friendly")
- goodWithDogs_match: Enum for filtering. MUST be exactly one of: "yes", "somewhat", "no", "unknown"

- goodWithKids_text: Rich description for bios (e.g., "Great with kids of all ages", "Better with ages 8+", "No kids - easily startled")
- goodWithKids_match: Enum for filtering. MUST be exactly one of: "yes", "somewhat", "no", "unknown"
  - "yes" = good with children
  - "somewhat" = OK with older kids (8+), conditional
  - "no" = no children recommended
  - "unknown" = not tested or not mentioned

- specialNeeds: Any medical or behavioral needs (e.g., "None", "On thyroid medication", "FIV+ but healthy", "Needs slow introductions")
- backstory: History and how they came to the shelter (e.g., "Found as stray", "Owner surrender", "Rescued from hoarding")
- additionalNotes: Best match recommendations and other details (e.g., "Best for quiet home", "Needs patient adopter")

Be concise but informative. Preserve important nuances in the _text fields for bios. The _match fields are ONLY for filtering and must be exactly one of the allowed enum values.

Some transcripts include question labels in the format "Q{N} ({topic} asked):" before each answer. These labels appear when the observations come from a written form rather than spoken voice. Treat the labels as hints about what was asked, not as instructions on where to file the answer. Categorize each answer based on its content, not the label preceding it. If a caregiver writes about dogs under a "good with cats" label, the dog content belongs in the goodWithDogs fields. If they describe a cat's reaction to children under a "good with people" label, the kids content belongs in the goodWithKids fields.

For one-word affirmation answers ("yes", "no") under a labeled question, use the question topic as the subject of the affirmation. "Q6 (good with dogs asked): yes" means the animal is good with dogs.

When labels are absent (voice transcripts do not have them), categorize answers based on content alone as you normally would.`;

const ADOPTER_EXTRACTION_PROMPT = `You are an expert at extracting adopter preferences from coordinator summaries.

Extract the following information from the transcript. The transcript is a coordinator's summary of an adopter interview.

Return a JSON object with these exact fields:
- preferredSpecies: One of "dog", "cat", "small", or "any". Use "small" for rabbit, guinea pig, hamster, gerbil, ferret, chinchilla, rat, mouse, bird, or reptile. Use "any" if the adopter has no species preference. Extract even if buried in phrases like "I'd love a rabbit" or "we want a kitten."
- livingSituation: Their housing (e.g., "Apartment with balcony", "House with fenced yard", "Condo")
- householdMembers: Who lives in the home (e.g., "Two adults, no children", "Family with two kids ages 5 and 8", "Single adult with one cat")
- homeEnergyLevel: Activity level of the home (e.g., "Quiet and calm", "Active family", "Moderate, work from home")
- timeAvailable: Time for pet care (e.g., "Home most of the day", "Working full-time, home evenings", "Retired, lots of time")
- petExperience: Previous pet experience (e.g., "First-time pet owner", "Experienced with cats", "Had dogs growing up")
- preferredTraits: What they're looking for (e.g., "Young, playful cat", "Calm adult dog, medium size", "Any age, cuddly personality")
- openToSpecialNeeds: Boolean - are they open to special needs animals
- locationPreferences: Any location constraints (e.g., "Local only", "Can travel within state", "No preference")
- additionalNotes: Other relevant information

Be accurate and preserve the adopter's specific preferences.`;

export async function parseBehaviorNotes(
  transcript: string, 
  animalId: string,
  animalName?: string
): Promise<Omit<BehaviorNotes, 'animalId' | 'recordedAt' | 'rawTranscript'>> {
  const client = getOpenAI();
  
  console.log(`[Parser] Extracting behavior notes for animal ${animalId}`);
  
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: BEHAVIOR_EXTRACTION_PROMPT },
      { 
        role: 'user', 
        content: `${animalName ? `Animal: ${animalName} (ID: ${animalId})\n\n` : ''}Transcript:\n${transcript}` 
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });
  
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from GPT-4o');
  }
  
  const parsed = JSON.parse(content);
  const validated = BehaviorNotesSchema.parse(parsed);
  
  // Build result with both new and legacy fields
  const result = {
    ...validated,
    // Ensure legacy fields are populated for backward compat
    goodWithCats: validated.goodWithCats_text || '',
    goodWithDogs: validated.goodWithDogs_text || '',
    goodWithKids: validated.goodWithKids_text || '',
    otherAnimalReaction: '',
    kidBehavior: '',
  };
  
  console.log(`[Parser] Successfully extracted behavior notes`);
  
  return result;
}

export async function parseAdopterPreferences(
  transcript: string
): Promise<Omit<AdopterPreferences, 'id' | 'createdAt' | 'rawTranscript'>> {
  const client = getOpenAI();
  
  console.log(`[Parser] Extracting adopter preferences`);
  
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: ADOPTER_EXTRACTION_PROMPT },
      { role: 'user', content: `Coordinator's summary:\n${transcript}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });
  
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from GPT-4o');
  }
  
  const parsed = JSON.parse(content);
  const validated = AdopterPreferencesSchema.parse(parsed);
  
  console.log(`[Parser] Successfully extracted adopter preferences`);
  
  return validated;
}

// ============ Bio Generation ============

const BIO_GENERATION_PROMPT = `You are a professional animal shelter copywriter creating adoption bios. Your bios are warm, engaging, and designed to help animals find loving homes.

Create FOUR bios for this animal (2 sizes × 2 languages):

**LONG BIOS (100-150 words each):**
For animal cards in Web Matcher, Coordinator app
- Full personality description with quirks and endearing behaviors
- Mention compatibility (good with kids, cats, dogs) if known
- Be honest about any special needs while framing positively
- End with a warm adoption call-to-action

**SHORT BIOS (40-50 words each):**
For Facebook and social media posts
- Punchy, attention-grabbing opener
- Key personality hook that makes them memorable
- Brief, compelling call-to-action

**GUIDELINES FOR ALL:**
- Lead with personality, not just physical description
- Use active, engaging language
- Spanish bios should feel natural to native speakers, not machine-translated

Tone: Warm, hopeful, conversational - like a friend telling you about a wonderful pet they know.

Return plain text only. Do not include HTML tags, markdown formatting, or any markup.

Return a JSON object with exactly these fields:
- bio_en_long: English long bio (100-150 words)
- bio_es_long: Spanish long bio (100-150 words)
- bio_en_short: English short bio (40-50 words)
- bio_es_short: Spanish short bio (40-50 words)`;

const BiogenSchema = z.object({
  bio_en_long: z.string().describe('English long bio, 100-150 words').transform(sanitizeBioText),
  bio_es_long: z.string().describe('Spanish long bio, 100-150 words').transform(sanitizeBioText),
  bio_en_short: z.string().describe('English short bio, 40-50 words').transform(sanitizeBioText),
  bio_es_short: z.string().describe('Spanish short bio, 40-50 words').transform(sanitizeBioText),
});

export interface BioGenerationInput {
  name: string;
  species: string;
  breed: string;
  age: string;
  sex: string;
  color: string;
  transcripts: string;       // All raw transcripts concatenated
  mergedAttributes: string;  // JSON string of merged behavior attributes
}

export interface BioGenerationResult {
  bioEnLong: string;
  bioEsLong: string;
  bioEnShort: string;
  bioEsShort: string;
}

export async function generateAnimalBio(input: BioGenerationInput): Promise<BioGenerationResult> {
  const client = getOpenAI();
  
  console.log(`[Parser] Generating bios for ${input.name}`);
  
  const animalContext = `
Animal Information (from ShelterManager):
- Name: ${input.name}
- Species: ${input.species}
- Breed: ${input.breed}
- Age: ${input.age}
- Sex: ${input.sex}
- Color: ${input.color}

Merged Behavior Attributes (from caregiver observations):
${input.mergedAttributes}

Raw Caregiver Transcripts (chronological observations):
${input.transcripts || 'No transcripts available'}
`.trim();
  
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: BIO_GENERATION_PROMPT },
      { role: 'user', content: animalContext },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });
  
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from GPT-4o');
  }
  
  const parsed = JSON.parse(content);
  const validated = BiogenSchema.parse(parsed);
  
  console.log(`[Parser] Successfully generated bios for ${input.name}`);
  
  return {
    bioEnLong: validated.bio_en_long,
    bioEsLong: validated.bio_es_long,
    bioEnShort: validated.bio_en_short,
    bioEsShort: validated.bio_es_short,
  };
}

// Single-size bio generation prompts
const BIO_LONG_PROMPT = `You are a professional animal shelter copywriter creating an adoption bio.

Create a LONG BIO (100-150 words) in both English and Spanish:
- Full personality description with quirks and endearing behaviors
- Mention compatibility (good with kids, cats, dogs) if known
- Be honest about any special needs while framing positively
- End with a warm adoption call-to-action
- Spanish should feel natural to native speakers, not machine-translated

Tone: Warm, hopeful, conversational - like a friend telling you about a wonderful pet.

Return a JSON object with exactly these fields:
- bio_en: English bio (100-150 words)
- bio_es: Spanish bio (100-150 words)`;

const BIO_SHORT_PROMPT = `You are a professional animal shelter copywriter creating an adoption bio.

Create a SHORT BIO (40-50 words) in both English and Spanish:
- Punchy, attention-grabbing opener
- Key personality hook that makes them memorable
- Brief, compelling call-to-action
- Spanish should feel natural to native speakers, not machine-translated

Tone: Warm, hopeful, conversational.

Return a JSON object with exactly these fields:
- bio_en: English bio (40-50 words)
- bio_es: Spanish bio (40-50 words)`;

const SingleBioSchema = z.object({
  bio_en: z.string().transform(sanitizeBioText),
  bio_es: z.string().transform(sanitizeBioText),
});

export async function regenerateSingleBio(
  input: BioGenerationInput,
  size: 'long' | 'short'
): Promise<{ bioEn: string; bioEs: string }> {
  const client = getOpenAI();
  
  console.log(`[Parser] Regenerating ${size} bio for ${input.name}`);
  
  const animalContext = `
Animal Information (from ShelterManager):
- Name: ${input.name}
- Species: ${input.species}
- Breed: ${input.breed}
- Age: ${input.age}
- Sex: ${input.sex}
- Color: ${input.color}

Merged Behavior Attributes (from caregiver observations):
${input.mergedAttributes}

Raw Caregiver Transcripts (chronological observations):
${input.transcripts || 'No transcripts available'}
`.trim();
  
  const prompt = size === 'long' ? BIO_LONG_PROMPT : BIO_SHORT_PROMPT;
  
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: animalContext },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });
  
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from GPT-4o');
  }
  
  const parsed = JSON.parse(content);
  const validated = SingleBioSchema.parse(parsed);
  
  console.log(`[Parser] Successfully regenerated ${size} bio for ${input.name}`);
  
  return {
    bioEn: validated.bio_en,
    bioEs: validated.bio_es,
  };
}

const TRANSLATE_SYSTEM = `You are a translator. Output only the Spanish translation, nothing else.`;

export async function translateBioToSpanish(bioEn: string, _size: 'long' | 'short' = 'long'): Promise<string> {
  const client = getOpenAI();
  
  console.log(`[Parser] Translating bio to Spanish (${bioEn.split(/\s+/).length} words)`);
  
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: TRANSLATE_SYSTEM },
      { role: 'user', content: bioEn },
    ],
    temperature: 0.3,
  });
  
  const translation = completion.choices[0]?.message?.content?.trim();
  if (!translation) {
    throw new Error('No response from GPT-4o');
  }
  
  console.log(`[Parser] Translated to Spanish (${translation.split(/\s+/).length} words)`);
  
  return translation;
}

// For testing/validation
export { BehaviorNotesSchema, AdopterPreferencesSchema, BiogenSchema };

// ============ Adoption Application Translation ============

// Translate Spanish adoption application fields to English
export async function translateApplicationFields(
  spanishFields: Record<string, string | undefined>
): Promise<Record<string, string>> {
  const client = getOpenAI();
  
  // Filter out empty fields
  const fieldsToTranslate: Record<string, string> = {};
  for (const [key, value] of Object.entries(spanishFields)) {
    if (value && value.trim()) {
      fieldsToTranslate[key] = value;
    }
  }
  
  if (Object.keys(fieldsToTranslate).length === 0) {
    return {};
  }
  
  console.log(`[Parser] Translating ${Object.keys(fieldsToTranslate).length} adoption application fields from Spanish`);
  
  const prompt = `Translate the following adoption application fields from Spanish to English.
Return a JSON object with the same keys but English translations as values.
Preserve the meaning accurately. Keep proper nouns (names, addresses) unchanged.

Fields to translate:
${JSON.stringify(fieldsToTranslate, null, 2)}`;
  
  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a translator. Return only a JSON object with the translations.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from GPT-4o');
    }
    
    const translated = JSON.parse(content);
    console.log(`[Parser] Successfully translated application fields`);
    return translated;
  } catch (error) {
    console.error('[Parser] Translation error:', error);
    // Return empty object on error - application will still be saved in Spanish
    return {};
  }
}

export async function translateVolunteerFields(
  spanishFields: Record<string, string | undefined>
): Promise<Record<string, string>> {
  const client = getOpenAI();
  
  // Filter out empty fields
  const fieldsToTranslate: Record<string, string> = {};
  for (const [key, value] of Object.entries(spanishFields)) {
    if (value && value.trim()) {
      fieldsToTranslate[key] = value;
    }
  }
  
  if (Object.keys(fieldsToTranslate).length === 0) {
    return {};
  }
  
  console.log(`[Parser] Translating ${Object.keys(fieldsToTranslate).length} volunteer application fields from Spanish`);
  
  const prompt = `You are translating volunteer application fields from Spanish to English. These are free-text responses from a Spanish-speaking volunteer applicant. Translate each field naturally and conversationally, preserving the tone and meaning. Return a JSON object with the same keys, English values. If a value is empty or only whitespace, omit it from the response.

Fields to translate:
${JSON.stringify(fieldsToTranslate, null, 2)}`;
  
  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a translator. Return only a JSON object with the translations.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from GPT-4o');
    }
    
    const translated = JSON.parse(content);
    console.log(`[Parser] Successfully translated volunteer fields`);
    return translated;
  } catch (error) {
    console.error('[Parser] Volunteer translation error:', error);
    // Return empty object on error - application will still be saved in Spanish
    return {};
  }
}
