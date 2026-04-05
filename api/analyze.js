import { GoogleGenerativeAI } from "@google/generative-ai";
import Redis from "ioredis";
import { supabase } from "./_supabase.js";

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. 토큰 검증 및 사용자 ID 가져오기
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }

  const userId = user.id;

  try {
    const { diaryText } = req.body;
    if (!diaryText) {
      return res.status(400).json({ error: '일기 내용이 필요합니다.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API 키가 설정되지 않았습니다.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `너는 심리 상담가야. 사용자가 작성한 일기 내용을 읽고, 사용자의 감정을 한 단어로 요약해줘. 그리고 그 감정에 공감해주고, 따뜻한 응원의 메시지를 2~3문장으로 작성해줘. 답변 형식은 반드시 '감정:[요약된 감정]\n\n[응원 메시지]'와 같이 줄바꿈을 포함해서 보내줘.\n\n[사용자 일기]: ${diaryText}`;

    const result = await model.generateContent(prompt);
    const aiResponse = (await result.response.text()).trim();

    const timestampId = Date.now().toString();
    const createdAt = new Date().toISOString();

    const diaryData = {
      id: timestampId,
      diaryText,
      aiResponse,
      createdAt,
      userId
    };

    // 2. Supabase에 사용자별로 저장 (user_id 컬럼 필요)
    let supabaseSaved = false;
    try {
      const { error } = await supabase
        .from('diaries')
        .insert([{
          id: timestampId,
          diary_text: diaryText,
          ai_response: aiResponse,
          created_at: createdAt,
          user_id: userId // 사용자 ID 매핑
        }]);

      if (error) throw error;
      supabaseSaved = true;
    } catch (err) {
      console.error("[Supabase Save Error]:", err);
    }

    // 3. Redis에 사용자별 키로 저장 (diary:{userId}:{id})
    let redisSaved = false;
    if (redis) {
      try {
        await redis.set(`diary:${userId}:${timestampId}`, JSON.stringify(diaryData));
        redisSaved = true;
      } catch (err) {
        console.error("[Redis Save Error]:", err);
      }
    }

    return res.status(200).json({ 
      result: aiResponse,
      savedId: timestampId,
      status: { supabase: supabaseSaved, redis: redisSaved }
    });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
}
