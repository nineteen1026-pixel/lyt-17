import type { Weather } from '@/types';

export function useWeather() {
  const fetchWeather = async (): Promise<Weather | null> => {
    try {
      const position = await getCurrentPosition();
      const weather = await fetchWeatherFromAPI(position.coords.latitude, position.coords.longitude);
      return weather;
    } catch (error) {
      console.warn('获取天气信息失败，使用默认数据:', error);
      return generateMockWeather();
    }
  };

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('浏览器不支持地理定位'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 5000,
        maximumAge: 300000
      });
    });
  };

  const fetchWeatherFromAPI = async (lat: number, lon: number): Promise<Weather | null> => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,weather_code&timezone=auto`
      );
      if (!response.ok) throw new Error('天气API请求失败');
      
      const data = await response.json();
      return {
        recordId: 0,
        temperature: Math.round(data.current.temperature_2m),
        humidity: data.current.relative_humidity_2m,
        pressure: Math.round(data.current.surface_pressure),
        condition: decodeWeatherCode(data.current.weather_code),
        city: '当前位置'
      };
    } catch (error) {
      console.warn('天气API调用失败:', error);
      return generateMockWeather();
    }
  };

  const decodeWeatherCode = (code: number): string => {
    const weatherMap: Record<number, string> = {
      0: '晴',
      1: '大部晴朗', 2: '局部多云', 3: '阴',
      45: '雾', 48: '雾凇',
      51: '小毛毛雨', 53: '毛毛雨', 55: '大毛毛雨',
      61: '小雨', 63: '中雨', 65: '大雨',
      71: '小雪', 73: '中雪', 75: '大雪',
      80: '小阵雨', 81: '阵雨', 82: '大阵雨',
      95: '雷暴', 96: '雷暴伴小冰雹', 99: '雷暴伴大冰雹'
    };
    return weatherMap[code] || '未知';
  };

  const generateMockWeather = (): Weather => {
    const conditions = ['晴', '多云', '阴', '小雨', '大风'];
    return {
      recordId: 0,
      temperature: Math.round(15 + Math.random() * 20),
      humidity: Math.round(40 + Math.random() * 40),
      pressure: Math.round(1000 + Math.random() * 30),
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      city: '本地'
    };
  };

  return {
    fetchWeather
  };
}
