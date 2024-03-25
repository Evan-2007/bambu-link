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
