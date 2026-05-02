"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { MessageSquare, FileText, Calendar, Send, Loader2 } from "lucide-react";

export default function MedicalWorkspace() {
  const [activeTab, setActiveTab] = useState("chatbot");
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const [soapNote, setSoapNote] = useState<any>(null);
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);

  const handleTranscriptionComplete = (text: string) => {
    setTranscription(text);
  };

  const handleGenerateSoap = async () => {
    if (!transcription) return;

    setIsGeneratingSoap(true);
    try {
      const response = await fetch("/api/generate-soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription }),
      });

      if (response.ok) {
        const result = await response.json();
        setSoapNote(result.soap);
      }
    } catch (error) {
      console.error("SOAP generation error:", error);
    } finally {
      setIsGeneratingSoap(false);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    setIsChatLoading(true);
    // Chat logic would go here
    setTimeout(() => {
      setIsChatLoading(false);
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4">
          <h1 className="text-2xl font-bold">Medical OS</h1>
          <p className="text-muted-foreground">
            AI-powered medical documentation platform
          </p>
        </header>

        {/* Main Content with Tabs */}
        <main className="flex-1 p-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="chatbot" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Clinical Assistant
              </TabsTrigger>
              <TabsTrigger value="soap" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                SOAP Generator
              </TabsTrigger>
              <TabsTrigger value="appointments" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Appointments
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Chatbot */}
            <TabsContent value="chatbot" className="flex-1">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle>Clinical AI Assistant</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1 mb-4 p-4 bg-gray-50 rounded-lg overflow-y-auto min-h-[300px]">
                    <p className="text-muted-foreground text-center">
                      Ask clinical questions, get guidance on patient care, or request assistance with documentation.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your clinical question..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1"
                      rows={2}
                    />
                    <Button
                      onClick={handleChatSubmit}
                      disabled={!chatInput.trim() || isChatLoading}
                      className="self-end"
                    >
                      {isChatLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: SOAP Generator */}
            <TabsContent value="soap" className="flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                {/* Left Column: Voice Recorder & Transcription */}
                <div className="flex flex-col gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Voice Recording</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <VoiceRecorder
                        onTranscriptionComplete={handleTranscriptionComplete}
                        maxDuration={300}
                      />
                    </CardContent>
                  </Card>

                  {transcription && (
                    <Card className="flex-1">
                      <CardHeader>
                        <CardTitle>Transcription</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{transcription}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right Column: SOAP Note */}
                <Card className="flex flex-col">
                  <CardHeader>
                    <CardTitle>SOAP Note</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {!soapNote && !isGeneratingSoap && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">
                          Transcribe voice notes to generate SOAP notes automatically.
                        </p>
                        <Button
                          onClick={handleGenerateSoap}
                          disabled={!transcription}
                        >
                          Generate SOAP Note
                        </Button>
                      </div>
                    )}

                    {isGeneratingSoap && (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <p>Generating SOAP note...</p>
                      </div>
                    )}

                    {soapNote && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold mb-2">Subjective</h3>
                          <p className="text-sm">{soapNote.subjective?.historyOfPresentIllness}</p>
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Objective</h3>
                          <p className="text-sm">{soapNote.objective?.physicalExam}</p>
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Assessment</h3>
                          <p className="text-sm">{soapNote.assessment?.primaryDiagnosis}</p>
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Plan</h3>
                          <p className="text-sm">{soapNote.plan?.followUp}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab 3: Appointments */}
            <TabsContent value="appointments" className="flex-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No appointments scheduled
                    </p>
                    <Button>New Appointment</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
