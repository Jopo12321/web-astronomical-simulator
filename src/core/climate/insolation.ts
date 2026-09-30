import { sunriseHourAngle } from './solar';

/** Daily-mean insolation, W/m². Berger (1978) integral over the daylight hemisphere. */
export function dailyMeanInsolation(
  solarConstant: number,
  latitudeRad: number,
  declinationRad: number,
  distanceFactor: number,
): number {
  const hourAngle = sunriseHourAngle(latitudeRad, declinationRad, 0);
  if (hourAngle === null) return 0;
  const sinLat = Math.sin(latitudeRad);
  const cosLat = Math.cos(latitudeRad);
  const sinDec = Math.sin(declinationRad);
  const cosDec = Math.cos(declinationRad);
  const geometry = hourAngle * sinLat * sinDec + cosLat * cosDec * Math.sin(hourAngle);
  return ((solarConstant * distanceFactor) / Math.PI) * Math.max(0, geometry);
}
