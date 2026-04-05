import { GoogleGenerativeAI } from "@google/generative-ai";

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

    // Vercel 프로젝트 환경 변수에서 API 키를 가져옵니다.
    // 기존의 VITE_GEMINI_API_KEY 이름 또는 GEMINI_API_KEY를 사용할 수 있습니다.
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
    const text = await result.response.text();

    // 성공적으로 결과를 반환합니다.
    return res.status(200).json({ result: text.trim() });
  } catch (error) {
    console.error("Serverless API Error:", error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
}
