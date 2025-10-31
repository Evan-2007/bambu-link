import mqqt from "mqtt";
import {
  systemActions,
  systemActionsType,
  gcodeActions,
  gcodeActionsType,
  amsActions,
  amsActionsType,
} from "./actions/index";


interface ActionsType {
  system: systemActionsType;
  gcode: gcodeActionsType;
}

function connect({
  hostname,
  port = 8883,
  token,
  serial,
}: {
  hostname: string;
  port?: number;
  token: string;
  serial: string;
}) {
  const mqqtClient = mqqt.connect(`mqtts://${hostname}:${port}`, {
    username: "bblp",
    password: token,
    reconnectPeriod: 1,
    rejectUnauthorized: false,
  });

  let connected = false;
  console.log("connecting");
  mqqtClient.on("connect", () => {
    mqqtClient.subscribe(`device/${serial}/report`, (err: any) => {
      if (err) {
        console.log("error subscribing", err);
        process.exit(1);
      } else {
        connected = true;
      }
    });
  });

  function useActions(): Promise<ActionsType> {
    return new Promise((resolve) => {
      const checkConnected = setInterval(() => {
        if (connected) {
          clearInterval(checkConnected);
          resolve({
            system: systemActions(mqqtClient, serial),
            gcode: gcodeActions(mqqtClient, serial),
          });
        }
      }, 100);
    });
  }
  return {
    service: mqqtClient,
    actions: useActions(),
  };
}

export { connect };

import { Commands } from "./types/link";
import { error } from "console";

export class BambuLink implements Commands {
  private accessToken: string
  public sequenceNumber: number
  private host: string
  private mqttClient?: mqqt.MqttClient
  private lastFullResponse?: any
  private mqttError?: Error

  /**
   * Creates an instance of the BambuLink class.
   * @param accessToken The access token for authentication.
   * @param host The host address of the printer.
   * @param sequenceStart The start sequence number for the connection. Defaults to 0. Usefull if multiple clients are connected.
   */

  constructor(accessToken: string, host: string, sequenceStart: number = 0) {
    this.accessToken = accessToken
    this.sequenceNumber = sequenceStart
    this.host = host
  }

  private mqttListen() {
    if (!this.mqttClient) {
      throw new error 
    }
    this.mqttClient?.on("connect") {

    }
  }

  

  private startMqtt(){
    const { service } = connect({
      hostname: this.host,
      token: this.accessToken,
      serial: this.sequenceNumber.toString(),
    })
    this.mqttClient = service
  }
}