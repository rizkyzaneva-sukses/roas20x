export type StatusKey = "BAHAYA" | "CUKUP" | "PROPORSIONAL" | "-";

export type CalcInput = {
  hargaJual: number;
  adminPct: number;
  adminFlat: number;
  hpps: number[];
  diskonBundling: number;
  marginSetting?: {
    batasBahayaPct: number;
    batasCukupPct: number;
    labelBahaya: string;
    labelCukup: string;
    labelProporsional: string;
  } | null;
};

export function roasMinimum(marginPct: number) {
  return 1 / (1 - marginPct / 100);
}

export function calculateRoas(input: CalcInput) {
  const hargaJualBersih = Math.round(input.hargaJual * (1 - input.adminPct / 100) - input.adminFlat);
  const hppEfektif = Math.max(input.hpps.reduce((sum, hpp) => sum + hpp, 0) - input.diskonBundling, 0);
  if (hppEfektif <= 0 || hargaJualBersih <= 0) {
    return { hargaJualBersih, hppEfektif, roas: 0, marginPct: -100, status: "BAHAYA" as StatusKey, statusLabel: input.marginSetting?.labelBahaya ?? "Bahaya" };
  }
  const roas = hargaJualBersih / hppEfektif;
  const marginPct = (1 - hppEfektif / hargaJualBersih) * 100;
  if (!input.marginSetting) return { hargaJualBersih, hppEfektif, roas, marginPct, status: "-" as StatusKey, statusLabel: "-" };
  if (marginPct < input.marginSetting.batasBahayaPct) return { hargaJualBersih, hppEfektif, roas, marginPct, status: "BAHAYA" as StatusKey, statusLabel: input.marginSetting.labelBahaya };
  if (marginPct < input.marginSetting.batasCukupPct) return { hargaJualBersih, hppEfektif, roas, marginPct, status: "CUKUP" as StatusKey, statusLabel: input.marginSetting.labelCukup };
  return { hargaJualBersih, hppEfektif, roas, marginPct, status: "PROPORSIONAL" as StatusKey, statusLabel: input.marginSetting.labelProporsional };
}

export function publicCalcPayload(result: ReturnType<typeof calculateRoas>) {
  return {
    roas: Number(result.roas.toFixed(3)),
    margin_pct: Number(result.marginPct.toFixed(2)),
    status: result.status,
    status_label: result.statusLabel,
  };
}
