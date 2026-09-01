"use client";
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import {
  Mic,
  FileText,
  Loader2,
  Save,
  Copy,
  RefreshCw,
  Check,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Activity,
  Brain,
  Pill,
  AlertCircle,
} from "lucide-react";

interface SoapNote {
  subjective: {
    chiefComplaint: string;
    historyOfPresentIllness: string;
    pastMedicalHistory: string;
    medications: string;
    allergies: string;
    reviewOfSystems: string;
  };
  objective: {
    vitalSigns: string;
    physicalExam: string;
    labResults: string;
    imaging: string;
  };
  assessment: {
    primaryDiagnosis: string;
    differentialDiagnoses: string;
    icdCodes: string;
  };
  plan: {
    treatment: string;
    medications: string;
    followUp: string;
    referrals: string;
    patientEducation: string;
  };
}

interface SoapNoteEditorProps {
  sessionId: string;
  initialData?: Partial<SoapNote>;
  onSave?: (data: SoapNote) => void;
  onGenerateFromTranscription?: (transcription: string) => Promise<SoapNote>;
  className?: string;
}

const emptySoapNote: SoapNote = {
  subjective: {
    chiefComplaint: "",
    historyOfPresentIllness: "",
    pastMedicalHistory: "",
    medications: "",
    allergies: "",
    reviewOfSystems: "",
  },
  objective: {
    vitalSigns: "",
    physicalExam: "",
    labResults: "",
    imaging: "",
  },
  assessment: {
    primaryDiagnosis: "",
    differentialDiagnoses: "",
    icdCodes: "",
  },
  plan: {
    treatment: "",
    medications: "",
    followUp: "",
    referrals: "",
    patientEducation: "",
  },
};

interface SectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function Section({
  title,
  icon: Icon,
  color,
  bgColor,
  children,
  defaultExpanded = true,
}: SectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between p-4 transition-colors",
          bgColor,
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-xl",
              bgColor.replace("bg-", "bg-").replace("/50", "-100"),
            )}
          >
            <Icon className={cn("h-5 w-5", color)} />
          </div>
          <h3 className="font-black text-slate-900">{title}</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>
      {isExpanded && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

export function SoapNoteEditor({
  sessionId,
  initialData,
  onSave,
  onGenerateFromTranscription,
  className,
}: SoapNoteEditorProps) {
  const [soapNote, setSoapNote] = useState<SoapNote>({
    ...emptySoapNote,
    ...initialData,
  });
  const [transcription, setTranscription] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const handleTranscriptionComplete = useCallback((text: string) => {
    setTranscription(text);
  }, []);

  const handleGenerateSoap = async () => {
    if (!transcription) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate SOAP note");
      }

      const data = await response.json();
      const generatedSoap = data.soap || data;

      setSoapNote((prev) => ({
        subjective: {
          ...prev.subjective,
          chiefComplaint:
            generatedSoap.subjective?.chiefComplaint ||
            generatedSoap.subjective?.historyOfPresentIllness ||
            "",
          historyOfPresentIllness:
            generatedSoap.subjective?.historyOfPresentIllness || "",
        },
        objective: {
          ...prev.objective,
          physicalExam: generatedSoap.objective?.physicalExam || "",
        },
        assessment: {
          ...prev.assessment,
          primaryDiagnosis: generatedSoap.assessment?.primaryDiagnosis || "",
        },
        plan: {
          ...prev.plan,
          followUp: generatedSoap.plan?.followUp || "",
        },
      }));
    } catch (error) {
      console.error("Error generating SOAP note:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave?.(soapNote);
      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving SOAP note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopySoap = async () => {
    const text = `SOAP NOTE\n\nSUBJECTIVE\n${soapNote.subjective.chiefComplaint}\n${soapNote.subjective.historyOfPresentIllness}\n\nOBJECTIVE\n${soapNote.objective.physicalExam}\n\nASSESSMENT\n${soapNote.assessment.primaryDiagnosis}\n\nPLAN\n${soapNote.plan.treatment}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateField = (
    section: keyof SoapNote,
    field: string,
    value: string,
  ) => {
    setSoapNote((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, string>),
        [field]: value,
      },
    }));
  };

  const isEmpty = Object.values(soapNote).every((section) =>
    Object.values(section as Record<string, string>).every((val) => !val),
  );

  return (
    <div className={cn("flex flex-col h-full bg-slate-50", className)}>
      {/* Voice Recording Section */}
      <div className="flex-shrink-0 p-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2 mb-3">
          <Mic className="h-4 w-4 text-rose-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Voice Recording
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <VoiceRecorder
            onTranscriptionComplete={handleTranscriptionComplete}
            maxDuration={300}
          />
          {transcription && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600">
                  Transcription
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateSoap}
                  disabled={isGenerating}
                  className="h-8 text-xs"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-1" />
                      Generate SOAP
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-slate-700 line-clamp-4">
                {transcription}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SOAP Editor */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isEmpty ? (
          <Card className="border-dashed border-2 border-slate-300 bg-white">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Stethoscope className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium text-center mb-2">
                No SOAP note yet
              </p>
              <p className="text-sm text-slate-400 text-center">
                Record voice notes and generate a SOAP note, or start typing
                below.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Subjective */}
            <Section
              title="Subjective"
              icon={Stethoscope}
              color="text-rose-600"
              bgColor="bg-rose-50"
            >
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Chief Complaint
                  </label>
                  <Input
                    value={soapNote.subjective.chiefComplaint}
                    onChange={(e) =>
                      updateField(
                        "subjective",
                        "chiefComplaint",
                        e.target.value,
                      )
                    }
                    placeholder="Primary reason for visit..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    History of Present Illness
                  </label>
                  <Textarea
                    value={soapNote.subjective.historyOfPresentIllness}
                    onChange={(e) =>
                      updateField(
                        "subjective",
                        "historyOfPresentIllness",
                        e.target.value,
                      )
                    }
                    placeholder="Detailed description of symptoms..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Past Medical History
                    </label>
                    <Textarea
                      value={soapNote.subjective.pastMedicalHistory}
                      onChange={(e) =>
                        updateField(
                          "subjective",
                          "pastMedicalHistory",
                          e.target.value,
                        )
                      }
                      placeholder="Previous conditions..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Current Medications
                    </label>
                    <Textarea
                      value={soapNote.subjective.medications}
                      onChange={(e) =>
                        updateField("subjective", "medications", e.target.value)
                      }
                      placeholder="List medications..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Allergies
                  </label>
                  <Input
                    value={soapNote.subjective.allergies}
                    onChange={(e) =>
                      updateField("subjective", "allergies", e.target.value)
                    }
                    placeholder="NKDA, Penicillin..."
                    className="mt-1"
                  />
                </div>
              </div>
            </Section>

            {/* Objective */}
            <Section
              title="Objective"
              icon={Activity}
              color="text-blue-600"
              bgColor="bg-blue-50"
            >
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Vital Signs
                  </label>
                  <Input
                    value={soapNote.objective.vitalSigns}
                    onChange={(e) =>
                      updateField("objective", "vitalSigns", e.target.value)
                    }
                    placeholder="BP: 120/80, HR: 72, Temp: 98.6°F..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Physical Examination
                  </label>
                  <Textarea
                    value={soapNote.objective.physicalExam}
                    onChange={(e) =>
                      updateField("objective", "physicalExam", e.target.value)
                    }
                    placeholder="Clinical findings..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Lab Results
                    </label>
                    <Textarea
                      value={soapNote.objective.labResults}
                      onChange={(e) =>
                        updateField("objective", "labResults", e.target.value)
                      }
                      placeholder="Relevant labs..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Imaging
                    </label>
                    <Textarea
                      value={soapNote.objective.imaging}
                      onChange={(e) =>
                        updateField("objective", "imaging", e.target.value)
                      }
                      placeholder="X-ray, CT, MRI findings..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* Assessment */}
            <Section
              title="Assessment"
              icon={Brain}
              color="text-purple-600"
              bgColor="bg-purple-50"
            >
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Primary Diagnosis
                  </label>
                  <Input
                    value={soapNote.assessment.primaryDiagnosis}
                    onChange={(e) =>
                      updateField(
                        "assessment",
                        "primaryDiagnosis",
                        e.target.value,
                      )
                    }
                    placeholder="ICD-10 description..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Differential Diagnoses
                  </label>
                  <Textarea
                    value={soapNote.assessment.differentialDiagnoses}
                    onChange={(e) =>
                      updateField(
                        "assessment",
                        "differentialDiagnoses",
                        e.target.value,
                      )
                    }
                    placeholder="Alternative diagnoses to consider..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    ICD-10 Codes
                  </label>
                  <Input
                    value={soapNote.assessment.icdCodes}
                    onChange={(e) =>
                      updateField("assessment", "icdCodes", e.target.value)
                    }
                    placeholder="J06.9, R05.9..."
                    className="mt-1"
                  />
                </div>
              </div>
            </Section>

            {/* Plan */}
            <Section
              title="Plan"
              icon={Pill}
              color="text-emerald-600"
              bgColor="bg-emerald-50"
            >
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Treatment Plan
                  </label>
                  <Textarea
                    value={soapNote.plan.treatment}
                    onChange={(e) =>
                      updateField("plan", "treatment", e.target.value)
                    }
                    placeholder="Therapeutic interventions..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Medications
                  </label>
                  <Textarea
                    value={soapNote.plan.medications}
                    onChange={(e) =>
                      updateField("plan", "medications", e.target.value)
                    }
                    placeholder="Prescriptions, dosages..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Follow-up
                    </label>
                    <Input
                      value={soapNote.plan.followUp}
                      onChange={(e) =>
                        updateField("plan", "followUp", e.target.value)
                      }
                      placeholder="Return in 2 weeks..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Referrals
                    </label>
                    <Input
                      value={soapNote.plan.referrals}
                      onChange={(e) =>
                        updateField("plan", "referrals", e.target.value)
                      }
                      placeholder="Specialist referrals..."
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Patient Education
                  </label>
                  <Textarea
                    value={soapNote.plan.patientEducation}
                    onChange={(e) =>
                      updateField("plan", "patientEducation", e.target.value)
                    }
                    placeholder="Instructions for patient..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>
            </Section>
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 p-4 bg-white border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-500" />
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySoap}
              disabled={isEmpty}
            >
              {copied ? (
                <Check className="h-4 w-4 mr-1 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              {copied ? "Copied!" : "Copy SOAP"}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isEmpty || isSaving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Note
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
