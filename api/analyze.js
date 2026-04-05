import { GoogleGenerativeAI } from "@google/generative-ai";
import Redis from "ioredis";

// Vercel Serverless Redis 연결 설정 (REDIS_URL 환경 변수 필요)
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export default async function handler(req, res) {
  // POST 메서드만 허용합니다.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed, POST 요청만 가능합니다.' });
  }

  try {
    const { diaryText } = req.body;

    if (!diaryText) {
      return res.status(400).json({ error: '일기 내용이 필요합니다.' });
    }

    // 서버 사이드에서만 안전하게 관리되는 API 키를 사용합니다.
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: '서버에 API 키가 설정되어 있지 않습니다.' });
    }

    // Gemini AI 모델 초기화
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 프롬프트 구성
    const prompt = `너는 심리 상담가야. 사용자가 작성한 일기 내용을 읽고, 사용자의 감정을 한 단어로 요약해줘. 그리고 그 감정에 공감해주고, 따뜻한 응원의 메시지를 2~3문장으로 작성해줘. 답변 형식은 반드시 '감정:[요약된 감정]\n\n[응원 메시지]'와 같이 줄바꿈을 포함해서 보내줘.\n\n[사용자 일기]: ${diaryText}`;

    // 분석 요청 및 응답 대기
    const result = await model.generateContent(prompt);
    const aiResponse = await result.response.text();

    // Redis에 데이터 저장 시도
    let savedId = null;
    if (redis) {
      try {
        const id = Date.now().toString(); // 시간 기반 고유 ID 생성
        const diaryData = {
          id,
          diaryText,
          aiResponse: aiResponse.trim(),
          createdAt: new Date().toISOString()
        };
        
        // JSON 문자열로 저장 (키 형식: diary:ID)
        await redis.set(`diary:${id}`, JSON.stringify(diaryData));
        savedId = id;
        console.log(`Successfully saved diary to Redis with ID: ${id}`);
      } catch (redisError) {
        // Redis 저장 실패 시 로깅만 하고 메인 로직은 진행합니다.
        console.error("Redis Storage Error:", redisError);
      }
    } else {
      console.warn("REDIS_URL is not provided. Skipping Redis storage.");
    }

    // 성공적으로 결과를 반환합니다. (추가로 저장된 ID 정보도 포함)
    return res.status(200).json({ 
      result: aiResponse.trim(),
      savedId: savedId 
    });
  } catch (error) {
    console.error("Serverless API Error:", error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
}
