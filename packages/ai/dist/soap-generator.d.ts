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
        }, "strip", z.ZodTypeAny, {
            clientComplaint: string;
            historyOfPresentIllness: string;
            relevantHistory: string;
            medications: string;
            allergies: string;
            functionalLimitations: string | null;
        }, {
            clientComplaint: string;
            historyOfPresentIllness: string;
            relevantHistory: string;
            medications: string;
            allergies: string;
            functionalLimitations: string | null;
        }>;
        objective: z.ZodObject<{
            vitalSigns: z.ZodNullable<z.ZodString>;
            physicalExam: z.ZodString;
            mentalStatusExam: z.ZodNullable<z.ZodString>;
            labResults: z.ZodNullable<z.ZodString>;
            imaging: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            vitalSigns: string | null;
            physicalExam: string;
            mentalStatusExam: string | null;
            labResults: string | null;
            imaging: string | null;
        }, {
            vitalSigns: string | null;
            physicalExam: string;
            mentalStatusExam: string | null;
            labResults: string | null;
            imaging: string | null;
        }>;
        assessment: z.ZodObject<{
            primaryDiagnosis: z.ZodString;
            differentialDiagnoses: z.ZodString;
            clinicalReasoning: z.ZodString;
            complications: z.ZodNullable<z.ZodString>;
            tolerance: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            primaryDiagnosis: string;
            differentialDiagnoses: string;
            clinicalReasoning: string;
            complications: string | null;
            tolerance: string | null;
        }, {
            primaryDiagnosis: string;
            differentialDiagnoses: string;
            clinicalReasoning: string;
            complications: string | null;
            tolerance: string | null;
        }>;
        plan: z.ZodObject<{
            medications: z.ZodNullable<z.ZodString>;
            procedures: z.ZodNullable<z.ZodString>;
            clientEducation: z.ZodString;
            followUp: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            medications: string | null;
            procedures: string | null;
            clientEducation: string;
            followUp: string;
        }, {
            medications: string | null;
            procedures: string | null;
            clientEducation: string;
            followUp: string;
        }>;
        metadata: z.ZodObject<{
            encounterDate: z.ZodString;
            templateName: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            encounterDate: string;
            templateName: string;
        }, {
            encounterDate: string;
            templateName: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        subjective: {
            clientComplaint: string;
            historyOfPresentIllness: string;
            relevantHistory: string;
            medications: string;
            allergies: string;
            functionalLimitations: string | null;
        };
        objective: {
            vitalSigns: string | null;
            physicalExam: string;
            mentalStatusExam: string | null;
            labResults: string | null;
            imaging: string | null;
        };
        assessment: {
            primaryDiagnosis: string;
            differentialDiagnoses: string;
            clinicalReasoning: string;
            complications: string | null;
            tolerance: string | null;
        };
        plan: {
            medications: string | null;
            procedures: string | null;
            clientEducation: string;
            followUp: string;
        };
        metadata: {
            encounterDate: string;
            templateName: string;
        };
    }, {
        subjective: {
            clientComplaint: string;
            historyOfPresentIllness: string;
            relevantHistory: string;
            medications: string;
            allergies: string;
            functionalLimitations: string | null;
        };
        objective: {
            vitalSigns: string | null;
            physicalExam: string;
            mentalStatusExam: string | null;
            labResults: string | null;
            imaging: string | null;
        };
        assessment: {
            primaryDiagnosis: string;
            differentialDiagnoses: string;
            clinicalReasoning: string;
            complications: string | null;
            tolerance: string | null;
        };
        plan: {
            medications: string | null;
            procedures: string | null;
            clientEducation: string;
            followUp: string;
        };
        metadata: {
            encounterDate: string;
            templateName: string;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    soap: {
        subjective: {
            clientComplaint: string;
            historyOfPresentIllness: string;
            relevantHistory: string;
            medications: string;
            allergies: string;
            functionalLimitations: string | null;
        };
        objective: {
            vitalSigns: string | null;
            physicalExam: string;
            mentalStatusExam: string | null;
            labResults: string | null;
            imaging: string | null;
        };
        assessment: {
            primaryDiagnosis: string;
            differentialDiagnoses: string;
            clinicalReasoning: string;
            complications: string | null;
            tolerance: string | null;
        };
        plan: {
            medications: string | null;
            procedures: string | null;
            clientEducation: string;
            followUp: string;
        };
        metadata: {
            encounterDate: string;
            templateName: string;
        };
    };
}, {
    soap: {
        subjective: {
            clientComplaint: string;
            historyOfPresentIllness: string;
            relevantHistory: string;
            medications: string;
            allergies: string;
            functionalLimitations: string | null;
        };
        objective: {
            vitalSigns: string | null;
            physicalExam: string;
            mentalStatusExam: string | null;
            labResults: string | null;
            imaging: string | null;
        };
        assessment: {
            primaryDiagnosis: string;
            differentialDiagnoses: string;
            clinicalReasoning: string;
            complications: string | null;
            tolerance: string | null;
        };
        plan: {
            medications: string | null;
            procedures: string | null;
            clientEducation: string;
            followUp: string;
        };
        metadata: {
            encounterDate: string;
            templateName: string;
        };
    };
}>;
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
