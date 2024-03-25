export interface systemActionsType {
  pushAll: () => void;
  chamberLightOn: () => void;
  chamberLightOff: () => void;
  getVersion: () => void;
}

export interface fan {
  speed: number;
  fan: "PART" | "AUX" | "CHAMBER";
}

export interface gcodeActionsType {
  fanSpeed: (fan: "PART" | "AUX" | "CHAMBER", speed: number) => void;
  tempControl: (tool: "BED" | "EXTRUDER", temp: number) => void;
  move: (axis: "X" | "Y" | "Z", distance: number) => void;
  home: () => void;
}

export interface amsActionsType {
  unload: () => void;
}
