import { Agent, fetch as undiciFetch } from "undici";
import { SOCRATIC_MASTER_PROMPT } from "../../../lib/prompts";

export async function POST(req) {
  try {
    const { messageHistory, profileContext, currentTaskContext } = await req.json();

    const systemMessage = [
      SOCRATIC_MASTER_PROMPT,
      "\nStudent Profile:",
      JSON.stringify(profileContext, null, 2),
      "\nCurrent Task Context:",
      JSON.stringify(currentTaskContext, null, 2),
      "\nContext Stability Rules:",
      "- Keep the student's year level, subject, and current skill in mind for every reply.",
      "- Do not drift to unrelated subjects, year levels, or topics unless the student asks for a new topic.",
      "- If the student gives a new task or writing sample, update your working understanding of the current skill and criteria.",
      "- Prefer one focused coaching move per reply, not a broad lesson summary.",
      "- If the student has provided a draft, task sheet, or criteria, identify the highest-value writing goals for this task before coaching.",
      "- Translate those goals into simple XP-style improvement targets the student can choose from.",
      "- Do not mention or invent other subjects, year levels, or curriculum details.",
      "- If context is missing, ask for the smallest necessary detail before coaching further.",
    ].join("\n");

    const response = await undiciFetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      dispatcher: new Agent({ connect: { rejectUnauthorized: false } }),
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Socratic App",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          { role: "system", content: systemMessage },
          ...messageHistory,
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const responseText = await response.text();
    const parsedError = (() => {
      try {
        return JSON.parse(responseText);
      } catch {
        return null;
      }
    })();

    if (!response.ok) {
      const rawProviderMessage = parsedError?.error?.metadata?.raw;
      const providerMessage = parsedError?.error?.message || parsedError?.message || rawProviderMessage || responseText || "Unable to reach the AI service.";
      const isSpendLimit = /spend limit|insufficient credits|credit/i.test(providerMessage);
      const isRateLimit = /rate[- ]limit|retry after/i.test(providerMessage);

      const fallbackReply = isSpendLimit
        ? "The AI coaching service is currently unavailable because the OpenRouter key has reached its spend limit. Please try again later or update the API key."
        : isRateLimit
          ? "The AI coaching service is currently rate-limiting requests. Please wait a moment and try again."
          : "The AI coaching service is temporarily unavailable. Please try again in a moment.";

      return new Response(JSON.stringify({ reply: fallbackReply, fallback: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = responseText ? JSON.parse(responseText) : {};
    const reply = data?.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Unable to reach the AI service." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
