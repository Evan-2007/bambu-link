export type FanSpeeds = {
  part?: number;       
  chamber?: number;    
  aux?: number;        
  heatbreak?: number;  
};

export type Temperatures = {
  nozzle: number;
  nozzleTarget: number;
  bed: number;
  bedTarget: number;
  chamber?: number;
};

export type Lights = {
  chamber?: "on" | "off" | "flashing";
  work?: "on" | "off" | "flashing";
};

export type Ipcam = {
  enabled: boolean;                 
  record: "enable" | "disable";
  timelapse: "enable" | "disable";
  resolution?: string;              
  tutkServer?: "enable" | "disable";
  modeBits?: number | null;
};

export type Upgrade = {
  status: "IDLE" | "DOWNLOADING" | "INSTALLING" | "UNKNOWN";
  progressPct?: number | null;
  message?: string;
  hasNewVersion?: boolean;
  currentVersion?: string;
  newVersion?: string;
};

export type AmsTray = {
  id: number;                   
  type?: string;                
  colorHex?: string;            
  nozzleTempMin?: number | null;
  nozzleTempMax?: number | null;
  bedTemp?: number | null;
  external?: boolean;           
  remain?: number | null;       
  infoIdx?: string | null;      
};

export type AmsState = {
  trays: Record<number, AmsTray>; 
  trayNow?: number | null;        
  trayPre?: number | null;        
  existBits?: string | null;
  isBblBits?: string | null;
  version?: number | null;
};

export type NetworkInfo = {
  ip?: number;
  mask?: number;
};

export type PrinterState = {
  raw?: unknown;                 
  timestamp: number;             
  command?: string;
  sequenceId?: string | number;

  lifecycle?: string;
  printType?: string;            
  gcodeState?: string;           
  job?: {
    stage?: string | number;
    subStage?: number;
    percent?: number;
    remainingSeconds?: number;
    file?: string;
  };

  temps: Temperatures;
  fans: FanSpeeds;
  lights: Lights;
  ipcam?: Ipcam;
  upgrade?: Upgrade;
  ams?: AmsState;
  vtTray?: AmsTray;              
  online?: { ahb?: boolean; rfid?: boolean; version?: number | string };
  wifiSignalDbm?: number | null;
  homeFlag?: number | null;
  nozzleDiameter?: number | string | null;
  nozzleType?: string | null;
  network?: NetworkInfo[];
};