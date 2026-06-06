import { fetch as undiciFetch } from "undici";
import { SOCRATIC_MASTER_PROMPT } from "../../../lib/prompts";

/**
 * Handle a Socratic coaching chat request.
 * @param {Request} req
 * @param {Object} req.body
 * @param {Array<{role: string, content: string}>} req.body.messageHistory
 * @param {Object} req.body.profileContext
 * @param {Object} req.body.currentTaskContext
 * @param {string} [req.body.coachMode]
 * @returns {Promise<Response>}
 */
export async function POST(req) {
  try {
    const { messageHistory, profileContext, currentTaskContext, coachMode } = await req.json();

    const coachModeInstruction = {
      encouraging: "You are in ENCOURAGING mode. Be warm, affirming, and supportive. Celebrate effort and progress.",
      humourous: "You are in HUMOUROUS mode. Be light, playful, and use low-key Gen Z-adjacent humour. Never cringe or overdone.",
      reflective: "You are in REFLECTIVE mode. Be calm, probing, and help the student think deeply about their own thinking.",
      gentle: "You are in GENTLE mode. Be soft, reassuring, and patient. Reduce pressure and build confidence.",
      challenge: "You are in CHALLENGE mode. Be direct, push deeper thinking, and stretch the student beyond their comfort zone.",
    }[coachMode] || "You are in GENTLE mode. Be soft, reassuring, and patient.";

    const systemMessage = [
      SOCRATIC_MASTER_PROMPT.replace("{COACH_MODE}", coachModeInstruction),
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

    const trimmedHistory = messageHistory.length > 10
      ? [
          ...messageHistory.slice(0, 2),
          { role: "system", content: "[Earlier messages summarised]" },
          ...messageHistory.slice(-6),
        ]
      : messageHistory;

    const anchoredHistory = trimmedHistory.map((msg, index) => {
      if (msg.role === "user" && index === trimmedHistory.length - 1) {
        return {
          ...msg,
          content: `[CONTEXT: ${profileContext.yearLevel} student, subject: ${currentTaskContext.subject}. Stay on this year level and subject only.]\n\n${msg.content}`,
        };
      }
      return msg;
    });

    const response = await undiciFetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Socratic App",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.2-3b-instruct:free",
        route: "fallback",
        models: [
          "meta-llama/llama-3.2-3b-instruct:free",
          "mistralai/mistral-7b-instruct:free",
          "google/gemma-2-9b-it:free",
        ],
        messages: [
          { role: "system", content: systemMessage },
          ...anchoredHistory,
        ],
        temperature: 0.4,
        max_tokens: 400,
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
