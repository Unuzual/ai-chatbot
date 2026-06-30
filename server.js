// 로컬 개발 전용 서버. (Vercel 배포 시에는 api/chat.js 함수가 대신 동작한다.)
import express from "express";
import "dotenv/config";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import chatHandler from "./api/chat.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, "public")));

// 배포 환경과 동일하게 /api/chat 경로로 같은 핸들러를 사용
app.post("/api/chat", chatHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 챗봇 서버 실행: http://localhost:${PORT}`);
});
