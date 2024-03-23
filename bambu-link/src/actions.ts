export interface ActionsType {
  pushAll: () => void;
  chamberLightOn: () => void;
  chamberLightOff: () => void;
  getVersion: () => void;
}

export function actions(mqqtClient: any, serial: string) {
  const PUSH_ALL = { pushing: { sequence_id: "0", command: "pushall" } };
  const GET_VERSION = { info: { sequence_id: "0", command: "get_version" } };
  const CHAMBER_LIGHT_OFF = {
    system: {
      sequence_id: "0",
      command: "ledctrl",
      led_node: "chamber_light",
      led_mode: "off",
      led_on_time: 500,
      led_off_time: 500,
      loop_times: 0,
      interval_time: 0,
    },
  };
  const CHAMBER_LIGHT_ON = {
    system: {
      sequence_id: "0",
      command: "ledctrl",
      led_node: "chamber_light",
      led_mode: "on",
      led_on_time: 500,
      led_off_time: 500,
      loop_times: 0,
      interval_time: 0,
    },
  };

  return {
    pushAll: () => {
      mqqtClient.publish(`device/${serial}/report`, JSON.stringify(PUSH_ALL));
    },
    chamberLightOn: () => {
      mqqtClient.publish(
        `device/${serial}/report`,
        JSON.stringify(CHAMBER_LIGHT_ON),
      );
    },
    chamberLightOff: () => {
      mqqtClient.publish(
        `device/${serial}/report`,
        JSON.stringify(CHAMBER_LIGHT_OFF),
      );
    },
    getVersion: () => {
      mqqtClient.publish(
        `device/${serial}/report`,
        JSON.stringify(GET_VERSION),
      );
    },
  };
}
