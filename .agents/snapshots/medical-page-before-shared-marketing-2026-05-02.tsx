"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight">
          Smartek AI Medical OS
        </h1>
        <p className="text-xl text-muted-foreground">
          AI-powered medical documentation platform with voice-to-SOAP
          generation
        </p>

        <div className="pt-4">
          <Link href="/workspace">
            <Button size="lg" className="gap-2">
              Open Workspace
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 text-sm">
          <div className="p-4 bg-white rounded-lg border">
            <h3 className="font-semibold mb-1">Clinical Assistant</h3>
            <p className="text-muted-foreground">
              AI-powered medical Q&A and guidance
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg border">
            <h3 className="font-semibold mb-1">SOAP Generator</h3>
            <p className="text-muted-foreground">
              Voice-to-SOAP note generation
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg border">
            <h3 className="font-semibold mb-1">Appointments</h3>
            <p className="text-muted-foreground">
              Patient scheduling and management
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
