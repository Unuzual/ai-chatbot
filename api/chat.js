// Vercel 서버리스 함수. 로컬(server.js)에서도 이 핸들러를 그대로 재사용한다.
// API 키는 process.env에서만 읽고(서버 측), 클라이언트로는 절대 내려가지 않는다.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 허용됩니다." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!apiKey) {
    return res.status(500).json({ error: "서버에 OPENAI_API_KEY가 설정되지 않았습니다." });
  }

  const body = req.body || {};
  const history = Array.isArray(body.history) ? body.history : [];
  const message = (body.message || "").trim();
  if (!message) {
    return res.status(400).json({ error: "메시지가 비어 있습니다." });
  }

  // role이 user/assistant인 항목만 추려서 최근 20개만 사용 (토큰·비용 보호)
  const safeHistory = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }));

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "너는 친절한 한국어 도우미야. 간결하게 답해." },
          ...safeHistory,
          { role: "user", content: message },
        ],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("OpenAI 오류:", errText);
      return res.status(502).json({ error: "AI 응답을 가져오지 못했습니다." });
    }

    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content ?? "(응답 없음)";
    return res.status(200).json({ reply });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
