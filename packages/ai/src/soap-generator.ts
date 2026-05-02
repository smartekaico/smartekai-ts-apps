import { z } from "zod";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// SOAP Note Schema
export const soapNoteSchema = z.object({
  soap: z.object({
    subjective: z.object({
      clientComplaint: z.string(),
      historyOfPresentIllness: z.string(),
      relevantHistory: z.string(),
      medications: z.string(),
      allergies: z.string(),
      functionalLimitations: z.string().nullable(),
    }),
    objective: z.object({
      vitalSigns: z.string().nullable(),
      physicalExam: z.string(),
      mentalStatusExam: z.string().nullable(),
      labResults: z.string().nullable(),
      imaging: z.string().nullable(),
    }),
    assessment: z.object({
      primaryDiagnosis: z.string(),
      differentialDiagnoses: z.string(),
      clinicalReasoning: z.string(),
      complications: z.string().nullable(),
      tolerance: z.string().nullable(),
    }),
    plan: z.object({
      medications: z.string().nullable(),
      procedures: z.string().nullable(),
      clientEducation: z.string(),
      followUp: z.string(),
    }),
    metadata: z.object({
      encounterDate: z.string(),
      templateName: z.string(),
    }),
  }),
});

export type SoapNote = z.infer<typeof soapNoteSchema>;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

// Configurable model - defaults to Gemini 2.5 Flash (latest Flash model)
const MODEL_NAME = process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";

/**
 * Generates a SOAP note from transcribed medical conversation
 */
export async function generateSoapNote(
  transcription: string,
  patientInfo?: {
    name?: string;
    age?: string;
    gender?: string;
    encounterType?: string;
  },
  visitType?: "new_patient" | "followup" | "telehealth" | "acute",
  chiefComplaint?: string,
): Promise<SoapNote> {
  const model = google(
    MODEL_NAME.startsWith("models/") ? MODEL_NAME : `models/${MODEL_NAME}`,
  );

  const prompt = `
You are an experienced medical scribe creating a SOAP note from a doctor-patient conversation.

CONVERSATION TRANSCRIPT:
${transcription}

${patientInfo ? `PATIENT INFO: Name: ${patientInfo.name || "N/A"}, Age: ${patientInfo.age || "N/A"}, Gender: ${patientInfo.gender || "N/A"}` : ""}

${chiefComplaint ? `CHIEF COMPLAINT: ${chiefComplaint}` : ""}

${visitType ? `VISIT TYPE: ${visitType}` : ""}

Create a comprehensive SOAP note following medical documentation standards.

Guidelines:
- Subjective: Patient's reported symptoms, history, concerns
- Objective: Measurable/clinical findings, vitals, exam results
- Assessment: Clinical diagnosis, reasoning, differential
- Plan: Treatment plan, medications, follow-up instructions

Be concise but thorough. Use medical terminology appropriately.
`;

  const { object } = await generateObject({
    model,
    schema: soapNoteSchema,
    prompt,
  });

  return object;
}
