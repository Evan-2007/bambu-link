export function gcodeActions(mqqtClient: any, serial: string) {
  const payload = {
    print: {
      sequence_id: "1",
      command: "gcode_line",
      param: "",
    },
  };

  enum Fan {
    AUX = 2,
    CHAMBER = 3,
    PART = 1,
  }
  enum Tool {
    BED = 140,
    EXTRUDER = 104,
  }

  const home = () => {
    payload.print.param = "G28\n";
    return payload;
  };
  const tempControl = (tool: string, temp: number) => {
    payload.print.param = `M${Tool[tool as keyof typeof Tool]} S${temp} \n`;
    return payload;
  };
  const fanSpeed = (fan: string, speed: number) => {
    payload.print.param = `M106 P${Fan[fan as keyof typeof Fan]} S${speed} \n`;
    return payload;
  };
  const move = (axis: string, distance: number) => {
    payload.print.param =
      "M211 S \n" +
      "M211 X1 Y1 Z1\n" +
      "M1002 push_ref_mode\n" +
      "G91 \n" +
      `G1 ${axis}-${distance} F3000\n` +
      "M1002 pop_ref_mode\n" +
      "M211 R\n";
    return payload;
  };

  return {
    fanSpeed: (fan: string, speed: number) => {
      console.log(fanSpeed(fan, speed));
      mqqtClient.publish(
        `device/${serial}/report`,
        JSON.stringify(fanSpeed(fan, speed)),
      );
    },
    tempControl: (tool: string, temp: number) => {
      console.log(tempControl(tool, temp));
      mqqtClient.publish(
        `device/${serial}/report`,
        JSON.stringify(tempControl(tool, temp)),
      );
    },
    move: (axis: string, distance: number) => {
      console.log(move(axis, distance));
      mqqtClient.publish(
        `device/${serial}/report`,
        JSON.stringify(move(axis, distance)),
      );
    },
    home: () => {
      console.log(home());
      mqqtClient.publish(`device/${serial}/report`, JSON.stringify(home()));
    },
  };
}
