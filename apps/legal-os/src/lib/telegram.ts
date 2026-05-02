import { getBaseUrl } from "@/lib/utils";

export async function sendTelegramNotification(message: string) {
	const botToken = process.env.TELEGRAM_BOT_TOKEN;
	const chatId = process.env.TELEGRAM_CHAT_ID;

	if (!botToken || !chatId) {
		console.log("Telegram notification skipped: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
		return { success: false, error: "Missing config" };
	}

	try {
		const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				chat_id: chatId,
				text: message,
				parse_mode: "HTML",
			}),
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error("Telegram API Error:", errorData);
			return { success: false, error: errorData.description };
		}

		return { success: true };
	} catch (error) {
		console.error("Failed to send Telegram notification:", error);
		return { success: false, error: "Network error" };
	}
}
