"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.soapNoteSchema = void 0;
exports.generateSoapNote = generateSoapNote;
const zod_1 = require("zod");
const ai_1 = require("ai");
const google_1 = require("@ai-sdk/google");
// SOAP Note Schema
exports.soapNoteSchema = zod_1.z.object({
    soap: zod_1.z.object({
        subjective: zod_1.z.object({
            clientComplaint: zod_1.z.string(),
            historyOfPresentIllness: zod_1.z.string(),
            relevantHistory: zod_1.z.string(),
            medications: zod_1.z.string(),
            allergies: zod_1.z.string(),
            functionalLimitations: zod_1.z.string().nullable(),
        }),
        objective: zod_1.z.object({
            vitalSigns: zod_1.z.string().nullable(),
            physicalExam: zod_1.z.string(),
            mentalStatusExam: zod_1.z.string().nullable(),
            labResults: zod_1.z.string().nullable(),
            imaging: zod_1.z.string().nullable(),
        }),
        assessment: zod_1.z.object({
            primaryDiagnosis: zod_1.z.string(),
            differentialDiagnoses: zod_1.z.string(),
            clinicalReasoning: zod_1.z.string(),
            complications: zod_1.z.string().nullable(),
            tolerance: zod_1.z.string().nullable(),
        }),
        plan: zod_1.z.object({
            medications: zod_1.z.string().nullable(),
            procedures: zod_1.z.string().nullable(),
            clientEducation: zod_1.z.string(),
            followUp: zod_1.z.string(),
        }),
        metadata: zod_1.z.object({
            encounterDate: zod_1.z.string(),
            templateName: zod_1.z.string(),
        }),
    }),
});
const google = (0, google_1.createGoogleGenerativeAI)({
    apiKey: process.env.GOOGLE_AI_API_KEY,
});
// Configurable model - defaults to Gemini 2.5 Flash (latest Flash model)
const MODEL_NAME = process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";
/**
 * Generates a SOAP note from transcribed medical conversation
 */
async function generateSoapNote(transcription, patientInfo, visitType, chiefComplaint) {
    const model = google(MODEL_NAME.startsWith("models/") ? MODEL_NAME : `models/${MODEL_NAME}`);
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
    const { object } = await (0, ai_1.generateObject)({
        model,
        schema: exports.soapNoteSchema,
        prompt,
    });
    return object;
}
