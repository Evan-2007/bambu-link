import { z } from "zod";
import {
  PrinterState,
  Temperatures,
  FanSpeeds,
  Lights,
  Ipcam,
  Upgrade,
  AmsTray,
  AmsState,
} from "./types/printerState";

const zNum = z.preprocess((v) => {
  if (v === "" || v == null) return undefined;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return v;
}, z.number().optional());

const zStr = z.preprocess(
  (v) => (v == null ? undefined : String(v)),
  z.string().optional(),
);

const RawSchema = z
  .object({
    command: zStr,
    sequence_id: z.union([zStr, zNum]).optional(),
    print: z.any().optional(),
  })
  .passthrough();

export function normalizeRawStatus(input: unknown): PrinterState {
  const raw = RawSchema.safeParse(input);
  const now = Date.now();

  const get = (path: string[]): any => {
    let cur: any = (raw.success ? raw.data : input) as any;
    for (const p of path) {
      if (!cur || typeof cur !== "object") return undefined;
      cur = cur[p];
    }
    return cur;
  };

  const temps: Partial<Temperatures> = {
    nozzle: numU(get(["print", "nozzle_temper"])),
    nozzleTarget: numU(get(["print", "nozzle_target_temper"])),
    bed: numU(get(["print", "bed_temper"])),
    bedTarget: numU(get(["print", "bed_target_temper"])),
    chamber: numU(get(["print", "chamber_temper"])),
  };

  const fans: Partial<FanSpeeds> = {
    part: numU(get(["print", "cooling_fan_speed"])),
    chamber: numU(get(["print", "big_fan2_speed"])),
    aux: numU(get(["print", "big_fan1_speed"])),
    heatbreak: numU(get(["print", "heatbreak_fan_speed"])),
  };

  const lightsArray = arr(get(["print", "lights_report"]));
  const lights: Lights = {
    chamber: findLightMode(lightsArray, "chamber_light"),
    work: findLightMode(lightsArray, "work_light"),
  };

  const ipcamRaw = obj(get(["print", "ipcam"]));
  const ipcam: Ipcam | undefined = ipcamRaw
    ? {
        enabled: str(ipcamRaw.ipcam_dev, "0") === "1",
        record: (strU(ipcamRaw.ipcam_record) ?? "disable") as
          | "enable"
          | "disable",
        timelapse: (strU(ipcamRaw.timelapse) ?? "disable") as
          | "enable"
          | "disable",
        resolution: emptyToUndef(strU(ipcamRaw.resolution)),
        tutkServer:
          (strU(ipcamRaw.tutk_server) as "enable" | "disable") ?? undefined,
        modeBits: numU(ipcamRaw.mode_bits),
      }
    : undefined;

  const up = obj(get(["print", "upgrade_state"]));
  const newVer = arr(up?.new_ver_list)[0];
  const upgrade: Upgrade | undefined = up
    ? {
        status: (str(up.status, "UNKNOWN") as Upgrade["status"]) ?? "UNKNOWN",
        progressPct: parseProgressPct(up.progress),
        message: strU(up.message),
        hasNewVersion: !!newVer?.new_ver && newVer?.new_ver !== newVer?.cur_ver,
        currentVersion: strU(newVer?.cur_ver),
        newVersion: strU(newVer?.new_ver),
      }
    : undefined;

  const amsRaw = obj(get(["print", "ams"])) ?? {};
  const trays: Record<number, AmsTray> = {};
  const amsTrays = arr(amsRaw.ams);

  amsTrays.forEach((maybeUnit: any) => {
    const trayArr = arr(maybeUnit?.tray);
    trayArr.forEach((t: any) => {
      const tid = numU(t?.id);
      if (Number.isFinite(tid)) {
        trays[tid as number] = {
          id: tid as number,
          type: strU(t?.tray_type),
          colorHex: strU(t?.tray_color),
          nozzleTempMin: numU(t?.nozzle_temp_min),
          nozzleTempMax: numU(t?.nozzle_temp_max),
          bedTemp: numU(t?.bed_temp),
          remain: numU(t?.remain),
          infoIdx: strU(t?.tray_info_idx) ?? null,
          external: (tid as number) === 254,
        };
      }
    });
  });

  const ams: AmsState | undefined =
    Object.keys(trays).length > 0 ||
    hasAny(amsRaw, [
      "tray_now",
      "tray_pre",
      "ams_exist_bits",
      "tray_is_bbl_bits",
      "version",
    ])
      ? {
          trays,
          trayNow: numU(amsRaw.tray_now),
          trayPre: numU(amsRaw.tray_pre),
          existBits:
            strU(amsRaw.ams_exist_bits) ??
            strU(get(["print", "ams_exist_bits"])) ??
            null,
          isBblBits:
            strU(amsRaw.tray_is_bbl_bits) ??
            strU(get(["print", "tray_is_bbl_bits"])) ??
            null,
          version: numU(amsRaw.version) ?? numU(get(["print", "version"])),
        }
      : undefined;

  const vt = obj(get(["print", "vt_tray"]));
  const vtTray: AmsTray | undefined = vt
    ? {
        id: num(vt.id, 254),
        type: strU(vt.tray_type),
        colorHex: strU(vt.tray_color),
        nozzleTempMin: numU(vt.nozzle_temp_min),
        nozzleTempMax: numU(vt.nozzle_temp_max),
        bedTemp: numU(vt.bed_temp),
        remain: numU(vt.remain),
        infoIdx: strU(vt.tray_info_idx) ?? null,
        external: num(vt.id, 254) === 254,
      }
    : undefined;

  const netInfo = arr(get(["print", "net", "info"])).map((n) => ({
    ip: numU(n?.ip),
    mask: numU(n?.mask),
  }));

  const state: PrinterState = {
    raw: input,
    timestamp: now,
    command: strU(get(["print", "command"])) ?? strU(get(["command"])),
    sequenceId: get(["print", "sequence_id"]) ?? get(["sequence_id"]),

    lifecycle: strU(get(["print", "lifecycle"])),
    printType: strU(get(["print", "print_type"])),
    gcodeState: strU(get(["print", "gcode_state"])),

    job: {
      stage:
        strU(get(["print", "mc_print_stage"])) ??
        numU(get(["print", "mc_print_stage"])),
      subStage: numU(get(["print", "mc_print_sub_stage"])),
      percent: numU(get(["print", "mc_percent"])),
      remainingSeconds: numU(get(["print", "mc_remaining_time"])),
      file: strU(get(["print", "gcode_file"])),
    } as PrinterState["job"],

    temps: temps as Temperatures,
    fans: fans as FanSpeeds,
    lights,
    ipcam,
    upgrade,
    ams,
    vtTray,
    online: {
      ahb: boolU(get(["print", "online", "ahb"])),
      rfid: boolU(get(["print", "online", "rfid"])),
      version: get(["print", "online", "version"]),
    },
    wifiSignalDbm: parseDbmU(strU(get(["print", "wifi_signal"]))),
    homeFlag: numU(get(["print", "home_flag"])),
    nozzleDiameter: parseNozzleDiameterU(get(["print", "nozzle_diameter"])),
    nozzleType: strU(get(["print", "nozzle_type"])),
    network: netInfo.length ? netInfo : undefined,
  };

  return state;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, any> ? DeepPartial<T[K]> : T[K];
};

export function mergeDeep<T extends Record<string, any>>(
  base: T,
  patch: DeepPartial<T>,
): T {
  if (!isObject(base) || !isObject(patch)) return { ...(patch as any) } as T;
  const out: any = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (
      isObject(v) &&
      isObject(out[k]) &&
      !Array.isArray(v) &&
      !Array.isArray(out[k])
    ) {
      out[k] = mergeDeep(out[k], v as any);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export function mergeDefined<T extends Record<string, any>>(
  base: T | null,
  patch: DeepPartial<T>,
): T {
  if (base == null) return patch as T;
  return mergeDeep(base, patch);
}

export function updateAtPath<T extends object>(
  state: T,
  path: string,
  value: any,
): T {
  const keys = path.split(".").filter(Boolean);
  if (!keys.length) return state;
  const clone: any = Array.isArray(state)
    ? [...(state as any)]
    : { ...(state as any) };
  let cur: any = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]!;
    const next = cur[k];
    if (!isObject(next)) cur[k] = {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]!] = value;
  return clone;
}

export function select<T extends object, R = unknown>(
  state: T,
  path: string,
): R | undefined {
  const keys = path.split(".").filter(Boolean);
  let cur: any = state;
  for (const k of keys) {
    if (cur == null) return undefined;
    cur = cur[k];
  }
  return cur as R;
}

function isObject(v: any): v is Record<string, any> {
  return v && typeof v === "object";
}
function obj(v: any): Record<string, any> | undefined {
  return v && typeof v === "object" ? v : undefined;
}
function arr(v: any): any[] {
  return Array.isArray(v) ? v : [];
}
function str(v: any, d = ""): string {
  return typeof v === "string" ? v : v == null ? d : String(v);
}
function strU(v: any): string | undefined {
  return v == null ? undefined : String(v);
}
function num(v: any, d = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
function numU(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function boolU(v: any): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}
function emptyToUndef(s?: string): string | undefined {
  return s && s.trim().length ? s : undefined;
}
function findLightMode(
  list: any[],
  node: string,
): Lights[keyof Lights] | undefined {
  const hit = list.find((x) => x?.node === node);
  const m = hit?.mode;
  if (!m) return undefined;
  return m === "on" || m === "off" || m === "flashing" ? (m as any) : undefined;
}
function parseDbmU(s: string | null | undefined): number | undefined {
  if (!s) return undefined;
  const m = s.match(/-?\d+/);
  return m ? Number(m[0]) : undefined;
}
function parseNozzleDiameterU(v: any): number | string | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : String(v);
}
function parseProgressPct(p: any): number | undefined {
  if (p == null || p === "") return undefined;
  const s = String(p);
  const m = s.match(/(\d+(?:\.\d+)?)%?/);
  return m ? Number(m[1]) : undefined;
}
function hasAny(obj: Record<string, any>, keys: string[]): boolean {
  return keys.some((k) => obj[k] !== undefined);
}
