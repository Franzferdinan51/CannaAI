import {
  calculateVPD,
  saturationVaporPressureKpa,
  toFahrenheit,
  toCelsius,
  vpdBand,
  normalizeAcInfinityReading,
  acInfinitySensorId,
} from '@/lib/ac-infinity';

describe('ac-infinity', () => {
  describe('calculateVPD', () => {
    it('computes a sane VPD for typical tent conditions', () => {
      // 25°C / 60% RH ≈ 1.27 kPa
      const vpd = calculateVPD(25, 60);
      expect(vpd).toBeGreaterThan(1.1);
      expect(vpd).toBeLessThan(1.4);
    });

    it('drops toward zero at saturation', () => {
      expect(calculateVPD(25, 100)).toBeCloseTo(0, 1);
    });

    it('rises as air dries', () => {
      expect(calculateVPD(25, 40)).toBeGreaterThan(calculateVPD(25, 70));
    });

    it('saturation vapor pressure matches the Tetens reference (~3.17 kPa at 25°C)', () => {
      expect(saturationVaporPressureKpa(25)).toBeCloseTo(3.17, 1);
    });
  });

  describe('unit conversion', () => {
    it('round-trips F <-> C', () => {
      expect(toFahrenheit(25)).toBeCloseTo(77, 0);
      expect(toCelsius(77)).toBeCloseTo(25, 0);
    });
  });

  describe('vpdBand', () => {
    it('flags dry air in flower', () => {
      expect(vpdBand(1.6, 'flower')).toBe('high');
      expect(vpdBand(1.2, 'flower')).toBe('optimal');
    });

    it('is more lenient for seedlings', () => {
      expect(vpdBand(0.6, 'seedling')).toBe('optimal');
      expect(vpdBand(0.6)).toBe('low');
    });
  });

  describe('normalizeAcInfinityReading', () => {
    it('computes VPD when the controller does not report it', () => {
      const r = normalizeAcInfinityReading({ temperature: 77, temperatureUnit: 'F', humidity: 60 });
      expect(r.temperatureF).toBe(77);
      expect(r.vpdComputed).toBe(true);
      expect(r.vpdKpa).toBeGreaterThan(1.1);
    });

    it('accepts Celsius input', () => {
      const r = normalizeAcInfinityReading({ temperature: 25, temperatureUnit: 'C', humidity: 60 });
      expect(r.temperatureF).toBeCloseTo(77, 0);
    });

    it('keeps a reported VPD and marks it as not computed', () => {
      const r = normalizeAcInfinityReading({ temperature: 77, humidity: 60, vpd: 1.25 });
      expect(r.vpdKpa).toBe(1.25);
      expect(r.vpdComputed).toBe(false);
    });

    it('rejects out-of-range humidity', () => {
      expect(() => normalizeAcInfinityReading({ temperature: 77, humidity: 140 })).toThrow();
    });
  });

  describe('acInfinitySensorId', () => {
    it('builds a stable slug id', () => {
      expect(acInfinitySensorId('AB:CD:12')).toBe('ac-infinity-ab-cd-12');
      expect(acInfinitySensorId()).toBe('ac-infinity-default');
    });
  });
});
