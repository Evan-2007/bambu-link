import EventEmitter from "events";
export async function amsActions(mqqtClient: any, serial: string) {
  const eventEmitter = new EventEmitter();
  const load = {
    print: {
      command: "gcode_line",
      sequence_id: "1",
      param:
        "M620 S254\n" +
        "M106 S255\n" +
        "M104 S250\n" +
        "M17 S\n" +
        "M17 X0.5 Y0.5\n" +
        "G91\n" +
        "G1 Y-5 F1200\n" +
        "G1 Z3\n" +
        "G90\n" +
        "G28 X\n" +
        "M17 R\n" +
        "G1 X70 F21000\n" +
        "G1 Y245\n" +
        "G1 Y265 F3000\n" +
        "G4\n" +
        "M106 S0\n" +
        "M109 S250\n" +
        "G1 X90\n" +
        "G1 Y255\n" +
        "G1 X120\n" +
        "G1 X20 Y50 F21000\n" +
        "G1 Y-3\n" +
        "T254\n" +
        "G1 X54\n" +
        "G1 Y265\n" +
        "G92 E0\n" +
        "G1 E40 F180\n" +
        "G4\n" +
        "M104 S0\n" +
        "G1 X70 F15000\n" +
        "G1 X76\n" +
        "G1 X65\n" +
        "G1 X76\n" +
        "G1 X65\n" +
        "G1 X90 F3000\n" +
        "G1 Y255\n" +
        "G1 X100\n" +
        "G1 Y265\n" +
        "G1 X70 F10000\n" +
        "G1 X100 F5000\n" +
        "G1 X70 F10000\n" +
        "G1 X100 F5000\n" +
        "G1 X165 F12000\n" +
        "G1 Y245\n" +
        "G1 X70\n" +
        "G1 Y265 F3000\n" +
        "G91\n" +
        "G1 Z-3 F1200\n" +
        "G90\n" +
        "M621 S254\n" +
        "\n",
    },
  };
  return {
    unload: () => {
      mqqtClient.publish(`device/${serial}/report`, JSON.stringify({ load }));
    },
  };
}
