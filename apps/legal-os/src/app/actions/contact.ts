"use server";

import { Resend } from "resend";
import { z } from "zod";

// Initialize Resend with env variable (fails gracefully if missing for local dev without key)
const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

const contactSchema = z.object({
	name: z.string().min(2, "Name is required"),
	email: z.string().email("Invalid email address"),
	message: z.string().min(10, "Message must be at least 10 characters"),
});

export async function sendContactEmail(prevState: unknown, formData: FormData) {
	try {
		const rawData = {
			name: formData.get("name"),
			email: formData.get("email"),
			message: formData.get("message"),
		};

		// Validate data
		const validatedData = contactSchema.parse(rawData);

		// If we don't have a real API key, simulate success for development
		if (!process.env.RESEND_API_KEY) {
			console.log("simulating email send to team@smartekai.com", validatedData);
			await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network latency
			return { success: true, message: "Message simulated (no API key)" };
		}

		// Send real email via Resend
		const { data, error } = await resend.emails.send({
			from: "SmarTekAI Contact <onboarding@resend.dev>", // Default resend sandbox sender
			to: ["team@smartekai.com"],
			subject: `New Contact Form Submission from ${validatedData.name}`,
			text: `
Name: ${validatedData.name}
Email: ${validatedData.email}

Message:
${validatedData.message}
      `,
			replyTo: validatedData.email,
		});

		if (error) {
			console.error("Resend Error:", error);
			return {
				success: false,
				error: "Failed to send email. Please try again later.",
			};
		}

		return {
			success: true,
			message: "Your message has been sent successfully!",
		};
	} catch (error) {
		console.error("Contact Form Error:", error);
		if (error instanceof z.ZodError) {
			return {
				success: false,
				error: error.issues[0]?.message || "Validation failed",
			};
		}
		return { success: false, error: "An unexpected error occurred." };
	}
}
