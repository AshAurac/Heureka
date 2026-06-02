import { SOCRATIC_MASTER_PROMPT } from "../../../lib/prompts";

export async function POST(req) {
  const { messageHistory, profileContext, currentTaskContext } = await req.json();

  const systemMessage = [
    SOCRATIC_MASTER_PROMPT,
    "\nStudent Profile:",
    JSON.stringify(profileContext, null, 2),
    "\nCurrent Task Context:",
    JSON.stringify(currentTaskContext, null, 2),
  ].join("\n");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Socratic App",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages: [
        { role: "system", content: systemMessage },
        ...messageHistory,
      ],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(JSON.stringify({ error: errorText }), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content || "";
  return new Response(JSON.stringify({ reply }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
