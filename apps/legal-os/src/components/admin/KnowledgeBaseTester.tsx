"use client";

import { LegalResearchTool } from "@/components/legal/ai-tools/LegalResearchTool";

export function KnowledgeBaseTester() {
	return (
		<div className="animate-in fade-in duration-500">
			<LegalResearchTool mode="admin" />
		</div>
	);
}
