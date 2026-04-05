import Redis from "ioredis";

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!redis) {
    return res.status(500).json({ error: 'Redis connection not configured' });
  }

  try {
    // diary:* 패턴의 모든 키를 가져옵니다.
    const keys = await redis.keys('diary:*');
    
    if (keys.length === 0) {
      return res.status(200).json({ history: [] });
    }

    // 모든 키의 값을 병렬로 가져옵니다.
    const pipeline = redis.pipeline();
    keys.forEach(key => pipeline.get(key));
    const results = await pipeline.exec();

    const history = results
      .map(([err, result]) => {
        if (err) return null;
        try {
          return JSON.parse(result);
        } catch (e) {
          return null;
        }
      })
      .filter(item => item !== null)
      // 최신순(ID 또는 createdAt 기준 내림차순)으로 정렬
      .sort((a, b) => b.id - a.id);

    return res.status(200).json({ history });
  } catch (error) {
    console.error("History API Error:", error);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
}
