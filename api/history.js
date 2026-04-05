import Redis from "ioredis";
import { supabase } from "./_supabase.js";

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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
    let history = [];

    // 2. Supabase에서 현재 로그인한 사용자의 히스토리만 가져오기 (user_id 필터링)
    try {
      const { data, error } = await supabase
        .from('diaries')
        .select('*')
        .eq('user_id', userId) // 사용자별 필터링
        .order('id', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        history = data.map(item => ({
          id: item.id,
          diaryText: item.diary_text,
          aiResponse: item.ai_response,
          createdAt: item.created_at
        }));
        return res.status(200).json({ history });
      }
    } catch (supabaseError) {
      console.error("[Supabase Fetch Error]:", supabaseError);
    }

    // 3. Fallback: Redis에서 사용자별 데이터 조회 시도 (diary:{userId}:*)
    if (redis) {
      try {
        const keys = await redis.keys(`diary:${userId}:*`);
        
        if (keys.length > 0) {
          const pipeline = redis.pipeline();
          keys.forEach(key => pipeline.get(key));
          const results = await pipeline.exec();

          history = results
            .map(([err, result]) => {
              if (err) return null;
              try {
                return JSON.parse(result);
              } catch (e) {
                return null;
              }
            })
            .filter(item => item !== null)
            .sort((a, b) => b.id - a.id);
            
          return res.status(200).json({ history });
        }
      } catch (redisError) {
        console.error("[Redis Fetch Error]:", redisError);
      }
    }

    return res.status(200).json({ history: [] });

  } catch (error) {
    console.error("History API Error:", error);
    return res.status(500).json({ error: '히스토리를 가져오는 데 실패했습니다.' });
  }
}
