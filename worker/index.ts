const cities: Record<string, [number, number]> = {
  seoul: [37.5665, 126.978], siheung: [37.38, 126.8], busan: [35.1796, 129.0756], jeju: [33.4996, 126.5312]
};
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') return json({ ok: true, weather: env.WEATHER_PROVIDER, photoUpload: false });
    if (url.pathname === '/api/weather') {
      if (request.method !== 'GET') return json({ error: '허용하지 않는 요청입니다.' }, 405);
      const city = url.searchParams.get('city') ?? '';
      if (!Object.hasOwn(cities, city)) return json({ error: '지원하는 지역을 선택해 주세요.' }, 400);
      if (String(env.WEATHER_PROVIDER) !== 'open-meteo') return json({ error: '자동 날씨 연동을 준비 중입니다. 기온과 강수 여부를 직접 입력해 주세요.' }, 503);
      const key = new Request(`${url.origin}/api/weather?city=${city}`);
      const cached = await caches.default.match(key);
      if (cached) return cached;
      const [latitude, longitude] = cities[city];
      const upstream = new URL('https://api.open-meteo.com/v1/forecast');
      upstream.search = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), current: 'temperature_2m,precipitation', timezone: 'Asia/Seoul' }).toString();
      try {
        const result = await fetch(upstream, { signal: AbortSignal.timeout(5000) });
        if (!result.ok) throw new Error('weather-unavailable');
        const data: { current?: { temperature_2m: number; precipitation: number; time: string } } = await result.json();
        if (!data.current || !Number.isFinite(data.current.temperature_2m) || !Number.isFinite(data.current.precipitation)) throw new Error('invalid-weather');
        const response = Response.json({ temperature: data.current.temperature_2m, rain: data.current.precipitation > 0, observedAt: data.current.time, source: 'Open-Meteo', city }, { headers: { 'Cache-Control': 'public, max-age=600', 'X-Content-Type-Options': 'nosniff' } });
        ctx.waitUntil(caches.default.put(key, response.clone()));
        return response;
      } catch {
        return json({ error: '날씨를 불러오지 못했습니다. 기온과 강수 여부를 직접 입력해 주세요.' }, 502);
      }
    }
    if (url.pathname.startsWith('/api/')) return json({ error: '없는 기능입니다.' }, 404);
    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;
