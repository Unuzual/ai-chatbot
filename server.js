import express from "express";
import "dotenv/config";

const app = express();
app.use(express.json());

// public 폴더의 정적 파일(화면)을 제공
app.use(express.static("public"));

const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

if (!API_KEY) {
  console.error("⚠️  .env에 OPENAI_API_KEY가 없습니다.");
  process.exit(1);
}

// 채팅 API: 브라우저가 여기로만 요청을 보냄. 키는 이 서버 안에만 있음.
app.post("/api/chat", async (req, res) => {
  // 클라이언트가 보낸 대화 기록(history) + 이번 메시지(message)
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const message = (req.body?.message || "").trim();
  if (!message) {
    return res.status(400).json({ error: "메시지가 비어 있습니다." });
  }

  // role이 user/assistant인 항목만 추려서 안전하게 구성 (최근 20개만 사용)
  const safeHistory = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }));

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
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
    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 챗봇 서버 실행: http://localhost:${PORT}`);
});
