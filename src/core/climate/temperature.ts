import { dailyMeanInsolation } from './insolation';

export interface TemperatureGrid {
  latitudesDeg: number[];
  /** Celsius, indexed [time][latitude]. */
  celsius: number[][];
}

/**
 * Seasonal energy-balance model. Outgoing radiation is linear in temperature,
 * tuned so a 0.3 albedo and Earth's solar constant equilibrate near 15 °C.
 * Neighboring latitude bands exchange heat. This is the North et al. (1981) style
 * of model, integrated for a few years so the seasons repeat.
 */
export function seasonalTemperatures(input: {
  solarConstant: number;
  obliquityRad: number;
  eccentricity: number;
  /** True anomaly of the northern spring equinox, radians. */
  equinoxTrueAnomaly: number;
  samples?: number;
}): TemperatureGrid {
  const bands = 19;
  const samples = input.samples ?? 24;
  const latitudes = Array.from({ length: bands }, (_, index) => -90 + (180 * index) / (bands - 1));
  const albedo = 0.3;
  const outgoingA = 206.8;
  const outgoingB = 2.09;
  const heatCapacity = 2.5e8;
  const diffusion = 0.55;
  let temperature = latitudes.map(() => 15);
  const years = 4;

  const record: number[][] = [];
  for (let year = 0; year < years; year += 1) {
    for (let sample = 0; sample < samples; sample += 1) {
      const fraction = sample / samples;
      const trueAnomaly = input.equinoxTrueAnomaly + fraction * Math.PI * 2;
      const radiusFactor =
        (1 + input.eccentricity * Math.cos(trueAnomaly)) / (1 - input.eccentricity ** 2);
      const declination = Math.asin(
        Math.sin(input.obliquityRad) * Math.sin(trueAnomaly - input.equinoxTrueAnomaly),
      );
      const heating = latitudes.map((latitude) =>
        dailyMeanInsolation(
          input.solarConstant,
          (latitude * Math.PI) / 180,
          declination,
          radiusFactor ** 2,
        ),
      );
      const next = temperature.map((value, index) => {
        const absorbed = heating[index] * (1 - albedo);
        const outgoing = outgoingA + outgoingB * value;
        const north = temperature[Math.min(bands - 1, index + 1)] ?? value;
        const south = temperature[Math.max(0, index - 1)] ?? value;
        const spread = diffusion * (north + south - 2 * value);
        const stepDays = 365.25 / samples;
        const delta = ((absorbed - outgoing + spread) / heatCapacity) * stepDays * 86400;
        return value + delta;
      });
      temperature = next;
      if (year === years - 1) record.push([...temperature]);
    }
  }
  return { latitudesDeg: latitudes, celsius: record };
}

export function meanTemperature(grid: TemperatureGrid): number {
  let weighted = 0;
  let weight = 0;
  for (const row of grid.celsius) {
    for (let index = 0; index < row.length; index += 1) {
      const lat = (grid.latitudesDeg[index] * Math.PI) / 180;
      const band = Math.cos(lat);
      weighted += (row[index] ?? 0) * band;
      weight += band;
    }
  }
  return weighted / weight;
}
