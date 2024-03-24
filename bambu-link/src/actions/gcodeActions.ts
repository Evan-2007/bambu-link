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

  const tempControl = (tool: string, temp: number) => {
    payload.print.param = `M${Tool[tool as keyof typeof Tool]} S${temp} \n`;
    return payload;
  };
  const fanSpeed = (fan: string, speed: number) => {
    payload.print.param = `M106 P${Fan[fan as keyof typeof Fan]} S${speed} \n`;
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
  };
}
