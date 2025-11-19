import { Commands } from "./types/link";
import { MqttStreamClient } from "./mqtt";
import { EventEmitter } from "events";
import { normalizeRawStatus, DeepPartial } from "./state";
import { PrinterState } from "./types/printerState";
export class BambuLink extends EventEmitter implements Commands {
  private accessToken: string;
  public sequenceNumber: number;
  private host: string;
  private lastFullResponse?: any;
  private mqttError?: Error;
  private port: number;
  private serial: string;
  private mqttClient?: MqttStreamClient;

  private state: PrinterState | null = null;
  private lastSequenceId: number | null = null;
  private sequenceIdCounter: number = 10;

  /**
   * Creates an instance of the BambuLink class.
   * @param accessToken The access token for authentication.
   * @param host The host address of the printer.
   * @param sequenceStart The start sequence number for the connection. Defaults to 0. Useful if multiple clients are connected.
   * @param port The port number for the connection. Defaults to 8883.
   * @param serial The serial number of the printer.
   */

  constructor(
    accessToken: string,
    host: string,
    sequenceStart: number = 0,
    port: number = 8883,
    serial: string,
  ) {
    super();
    this.accessToken = accessToken;
    this.sequenceNumber = sequenceStart;
    this.host = host;
    this.port = port;
    this.serial = serial;
    console.log(
      `Initializing BambuLink for printer ${serial} at ${host}:${port} with sequence start ${sequenceStart}`,
    );
    this.mqttClient = new MqttStreamClient(
      `mqtts://${this.host}:${this.port}`,
      `device/${this.serial}/report`,
      {
        username: "bblp",
        password: this.accessToken,
        reconnectPeriod: 1,
        rejectUnauthorized: false,
      },
    );
    this.setupEventForwarding();
  }

  private setupEventForwarding() {
    this.mqttClient?.on("connect", async () => {
      this.emit("connect");
      await this.initialMessage();
    });
    this.mqttClient?.on("error", (err) => {
      this.mqttError = err;
      this.emit("error", err);
    });
    this.mqttClient?.on("data", ({ topic, message }) => {
      this.emit("data", topic, message);
      this.ingestMessage(message);
    });
  }

  private async initialMessage() {
    const message = await this.mqttClient
      ?.sendCommand(
        JSON.stringify({
          pushing: {
            sequence_id: this.sequenceIdCounter,
            command: "pushall",
            version: 1,
            push_target: 1,
          },
        }),
        this.sequenceIdCounter,
        false,
      )
      .catch((err) => {
        console.error("Error during initial message:", err);
        return;
      });
    console.log("Initial message received");
    this.ingestMessage(message?.data);
    this.sequenceIdCounter += 1;
  }

  private ingestMessage(message: any) {
    if (!message || typeof message !== "object") return;

    const normalized = normalizeRawStatus(message);

    const seq = normalized.sequenceId;
    if (seq !== undefined && seq === this.lastSequenceId) return;
    this.lastSequenceId = seq === undefined ? null : Number(seq);

    const next = mergeDefined<PrinterState>(
      this.state,
      normalized as Partial<PrinterState>,
    );

    const patch = diffMinimal<PrinterState>(this.state, next);
    if (patch) this.emit("stateUpdate", patch, this.state);

    this.state = next;
    this.emit("state", this.state);
  }

  public getFullState(): PrinterState | null {
    return this.state;
  }

  public connect(): void {
    this.mqttClient?.connect();
  }

  public disconnect(): void {
    this.mqttClient?.disconnect();
  }

  public getMqttClient(): MqttStreamClient | undefined {
    return this.mqttClient;
  }

  public refreshState(): void {
    // Should not be needed, as we get pushed updates. Calling to much can cause lag on p1s.
    this.initialMessage();
  }

  private sendPrintCommand(command: string, param: any = ""): Promise<any> {
    const sequenceId = ++this.sequenceIdCounter;

    const payload = {
      print: {
        sequence_id: sequenceId,
        command: command,
        param: param,
      },
    };

    const commandJson = JSON.stringify(payload);

    return this.mqttClient!.sendCommand(commandJson, sequenceId, true);
  }

  public stopPrint(): Promise<any> {
    return this.sendPrintCommand("stop");
  }

  public pausePrint(): Promise<any> {
    return this.sendPrintCommand("pause");
  }

  public resumePrint(): Promise<any> {
    return this.sendPrintCommand("resume");
  }

  /**
   * Sets the print speed percentage.
   * @param speedPct 1 = silent, 2 = standard, 3 = sport, 4 = ludicrous
   * @returns A Promise that resolves with the response or rejects on timeout.
   */
  public printSpeedSet(speedPct: 1 | 2 | 3 | 4): Promise<any> {
    return this.sendPrintCommand("speed", speedPct);
  }

  /**
   * selects gcode file to print
   * @param fileName The name of the gcode file on the printer storage. Absolute path.
   * @returns A Promise that resolves with the response or rejects on timeout.
   */
  public printGcode_file(fileName: string): Promise<any> {
    return this.sendPrintCommand("gcode_file", fileName);
  }

  /** * sends raw gcode to printer
   * @param gcode The gcode string to send to the printer.
   * @returns A Promise that resolves with the response or rejects on timeout.
   */
  public printGcode(gcode: string): Promise<any> {
    return this.sendPrintCommand("gcode_line", gcode);
  }

  public calibration(): Promise<any> {
    return this.sendPrintCommand("calibration");
  }

  public unloadFilament(): Promise<any> {
    return this.sendPrintCommand("unload_filament");
  }

  // public setTemperature(tool: 'BED' | 'EXTRUDER', temperature: number): Promise<any> {
  //     enum Tool {
  //       BED = 140,
  //       EXTRUDER = 104,
  //     }
  //   return this.printGcode(`M${Tool[tool]} S${temperature} \n`);
  // }
  // public home(): Promise<any> {
  //   return this.printGcode("G28\n");
  // }

  public setFanSpeed(
    speed: number,
    fan: "AUX" | "CHAMBER" | "PART",
  ): Promise<any> {
    if (speed < 0 || speed > 255) {
      return Promise.reject(new Error("Fan speed must be between 0 and 255."));
    }
    enum Fan {
      AUX = 2,
      CHAMBER = 3,
      PART = 1,
    }
    return this.printGcode(`M106 P${Fan[fan]} S${speed}\n`);
  }

  /**
   * Moves the specified axis by the given distance.
   * WARNING: This command could bypass endstops.
   * @param axis 'X', 'Y', or 'Z'
   * @param distance Distance to move in millimeters.
   * @param feedrate Feedrate in mm/min. Default is 9000.
   * @returns A Promise that resolves with the response or rejects on timeout.
   */
  public move(
    axis: "X" | "Y" | "Z",
    distance: number,
    feedrate: number = 9000,
  ): Promise<any> {
    // if (this.state && axis === 'E' && this.state.temps.nozzle < 180) {
    //   console.warn(new Error("Extruder should be heated to >180C before moving E axis."));
    // }
    // if (!this.state && axis === 'E') {
    //   console.warn('Make sure extruder is heated to >180C before moving E axis.');
    // }
    return this.printGcode(
      `M211 S ; save soft endstop flag\nM211 X1 Y1 Z1 ; turn on soft endstop\nM1002 push_ref_mode\nG91\nG1 ${axis}${distance} F${feedrate}\nM1002 pop_ref_mode\nM211 R ; restore soft endstop flag\n`,
    );
  }

  /**
   * Sets the LED mode.
   * @param mode "off", "on", or "flashing"
   * @param node 'chamber_light' | 'work_light'
   * @param flashing Flashing parameters if mode is "flashing"
   * @returns A Promise that resolves with the response or rejects on timeout.
   */
  public ledSet(
    mode: "off" | "on" | "flashing",
    node: "chamber_light" | "work_light",
    flashing: {
      led_on_time: number;
      led_off_time: number;
      loop_times: number;
      interval: number;
    } = { led_on_time: 500, led_off_time: 500, loop_times: 1, interval: 1000 },
  ): Promise<any> {
    const sequenceId = ++this.sequenceIdCounter;

    const payload = {
      system: {
        sequence_id: sequenceId,
        command: "ledctrl",
        led_node: node,
        led_mode: mode,
        led_on_time: flashing.led_on_time,
        led_off_time: flashing.led_off_time,
        loop_times: flashing.loop_times,
        interval: flashing.interval,
      },
    };

    const commandJson = JSON.stringify(payload);

    return this.mqttClient!.sendCommand(commandJson, sequenceId, true);
  }

  public home(): Promise<any> {
    return this.printGcode("G28\n");
  }
}

function diffMinimal<T>(oldVal: any, newVal: any): DeepPartial<T> | null {
  if (oldVal === newVal) return null;

  const bothObjects =
    oldVal &&
    newVal &&
    typeof oldVal === "object" &&
    typeof newVal === "object";
  if (!bothObjects) return newVal as any;

  if (Array.isArray(oldVal) || Array.isArray(newVal)) {
    const a = Array.isArray(oldVal) ? oldVal : [];
    const b = Array.isArray(newVal) ? newVal : [];
    if (a.length !== b.length) return newVal as any;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return newVal as any;
    return null;
  }

  const keys = new Set([
    ...Object.keys(oldVal ?? {}),
    ...Object.keys(newVal ?? {}),
  ]);
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

function mergeDefined<T extends Record<string, any>>(
  base: T | null,
  patch: Partial<T>,
): T {
  if (base == null) return patch as T;
  const out: any = Array.isArray(base) ? [...base] : { ...base };

  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const prev = (out as any)[k];
      (out as any)[k] = mergeDefined(
        prev && typeof prev === "object" && !Array.isArray(prev) ? prev : {},
        v as any,
      );
    } else {
      (out as any)[k] = v;
    }
  }
  return out as T;
}
