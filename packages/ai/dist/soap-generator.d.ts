import { z } from "zod";
export declare const soapNoteSchema: z.ZodObject<{
    soap: z.ZodObject<{
        subjective: z.ZodObject<{
            clientComplaint: z.ZodString;
            historyOfPresentIllness: z.ZodString;
            relevantHistory: z.ZodString;
            medications: z.ZodString;
            allergies: z.ZodString;
            functionalLimitations: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        objective: z.ZodObject<{
            vitalSigns: z.ZodNullable<z.ZodString>;
            physicalExam: z.ZodString;
            mentalStatusExam: z.ZodNullable<z.ZodString>;
            labResults: z.ZodNullable<z.ZodString>;
            imaging: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        assessment: z.ZodObject<{
            primaryDiagnosis: z.ZodString;
            differentialDiagnoses: z.ZodString;
            clinicalReasoning: z.ZodString;
            complications: z.ZodNullable<z.ZodString>;
            tolerance: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        plan: z.ZodObject<{
            medications: z.ZodNullable<z.ZodString>;
            procedures: z.ZodNullable<z.ZodString>;
            clientEducation: z.ZodString;
            followUp: z.ZodString;
        }, z.core.$strip>;
        metadata: z.ZodObject<{
            encounterDate: z.ZodString;
            templateName: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type SoapNote = z.infer<typeof soapNoteSchema>;
/**
 * Generates a SOAP note from transcribed medical conversation
 */
export declare function generateSoapNote(transcription: string, patientInfo?: {
    name?: string;
    age?: string;
    gender?: string;
    encounterType?: string;
}, visitType?: "new_patient" | "followup" | "telehealth" | "acute", chiefComplaint?: string): Promise<SoapNote>;
