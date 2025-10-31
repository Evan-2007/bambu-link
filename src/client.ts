import { Commands } from "./types/link";
import { error } from "console";
import {MqttStreamClient} from "./mqtt";
import { EventEmitter } from 'events';
import {
  normalizeRawStatus,
  mergeDeep,
  updateAtPath,
  select,
  DeepPartial
} from "./state";
import { PrinterState } from "./types/printerState";
import { version } from "os";
import { no } from "zod/v4/locales";

export class BambuLink extends EventEmitter implements Commands {
  private accessToken: string
  public sequenceNumber: number
  private host: string
  private lastFullResponse?: any
  private mqttError?: Error
  private port: number
  private serial: string
  private mqttClient?: MqttStreamClient

  private state: PrinterState | null = null;
  private lastSequenceId: number | null = null;
  private sequenceIdCounter: number = 10;
  

  /**
   * Creates an instance of the BambuLink class.
   * @param accessToken The access token for authentication.
   * @param host The host address of the printer.
   * @param sequenceStart The start sequence number for the connection. Defaults to 0. Usefull if multiple clients are connected.
   * @param port The port number for the connection. Defaults to 8883.
   * @param serial The serial number of the printer.
   */

  constructor(accessToken: string, host: string, sequenceStart: number = 0, port: number = 8883, serial: string) {
    super()
    this.accessToken = accessToken
    this.sequenceNumber = sequenceStart
    this.host = host
    this.port = port
    this.serial = serial
    console.log(`Initializing BambuLink for printer ${serial} at ${host}:${port} with sequence start ${sequenceStart}`);
    this.mqttClient = new MqttStreamClient(
      `mqtts://${this.host}:${this.port}`,
      `device/${this.serial}/report`,
      {
        username: "bblp",
        password: this.accessToken,
        reconnectPeriod: 1,
        rejectUnauthorized: false,
      },
    )
    this.setupEventForwarding()
  }

  private setupEventForwarding() {
    this.mqttClient?.on('connect', async () => {
      this.emit('connect');
      await this.initialMessage()
    });
    this.mqttClient?.on('error', (err) => {
      this.mqttError = err;
      this.emit('error', err);
    });
    this.mqttClient?.on('data', ({ topic, message }) => {
      this.emit('data', topic, message);
      this.ingestMessage(message);
    });
  }

  private async initialMessage() {
    const message = await this.mqttClient?.sendCommand(JSON.stringify({ pushing: { sequence_id: this.sequenceIdCounter, command: "pushall", version: 1, push_target: 1 } }), this.sequenceIdCounter, false).catch((err) => {
      console.error("Error during initial message:", err);
      return
    });
    console.log("Initial message received");
    this.ingestMessage(message?.data);
    this.sequenceIdCounter += 1;
  }

  private ingestMessage(message: any) {
    if (!message || typeof message !== 'object') return;

    const normalized = normalizeRawStatus(message);

    const seq = normalized.sequenceId;
    if (seq !== undefined && seq === this.lastSequenceId) return;
    this.lastSequenceId = seq === undefined ? null : Number(seq);

    const next = mergeDefined<PrinterState>(this.state, normalized as Partial<PrinterState>);

    const patch = diffMinimal<PrinterState>(this.state, next);
    if (patch) this.emit('stateUpdate', patch, this.state);

    this.state = next;
    this.emit('state', this.state);
  }

  public getFullState(): PrinterState | null {
    return this.state;
  }


  public connect(): void {
    this.mqttClient?.connect()
  }

  public disconnect(): void {
    this.mqttClient?.disconnect()
  }

  public getMqttClient(): MqttStreamClient | undefined {
    return this.mqttClient;
  }


}

function diffMinimal<T>(oldVal: any, newVal: any): DeepPartial<T> | null {
  if (oldVal === newVal) return null;

  const bothObjects =
    oldVal && newVal && typeof oldVal === "object" && typeof newVal === "object";
  if (!bothObjects) return newVal as any;

  if (Array.isArray(oldVal) || Array.isArray(newVal)) {
    const a = Array.isArray(oldVal) ? oldVal : [];
    const b = Array.isArray(newVal) ? newVal : [];
    if (a.length !== b.length) return newVal as any;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return newVal as any;
    return null;
  }

  const keys = new Set([...Object.keys(oldVal ?? {}), ...Object.keys(newVal ?? {})]);
  const out: any = {};
  let changed = false;
  for (const k of keys) {
    const d = diffMinimal(oldVal?.[k], newVal?.[k]);
    if (d !== null) {
      out[k] = d;
      changed = true;
    }
  }
  return changed ? (out as DeepPartial<T>) : null;
}

function mergeDefined<T extends Record<string, any>>(base: T | null, patch: Partial<T>): T {
  if (base == null) return patch as T;
  const out: any = Array.isArray(base) ? [...base] : { ...base };

  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue; 
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const prev = (out as any)[k];
      (out as any)[k] = mergeDefined(
        prev && typeof prev === "object" && !Array.isArray(prev) ? prev : {},
        v as any
      );
    } else {
      (out as any)[k] = v;
    }
  }
  return out as T;
}