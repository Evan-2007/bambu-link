import { EventEmitter } from "events";

export interface Commands {
  // move(axis: Axes[], value: number): Promise<boolean>;
  // extrude(direction: ExtrudeDirection, distance: number): Promise<boolean>;
  // home(): Promise<boolean>;
  // fanSpeed(fan: Fans[], speed: number): Promise<boolean>;
  // toggleLight(): Promise<boolean>;
  // bedTemp(temperature: number): Promise<boolean>;
  // nozzleTemp(temperature: number): Promise<boolean>;
  // pause(): Promise<boolean>;
  // resume(): Promise<boolean>;
  // cancel(): Promise<boolean>;

  sequenceNumber: number;
}
export type Axes = "X" | "Y" | "Z";
export type ExtrudeDirection = "in" | "out";
export type Fans = "Aux" | "Toolhead" | "Part";
