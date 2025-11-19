# bambu-link
A Node.js module for communicating with Bambu Lab 3D printers via MQTT. Currently still a work in progress.

**Tested on:** P1S

## Installation

Install the npm package:
```bash
npm i bambu-link
# or
yarn add bambu-link
# or
pnpm add bambu-link
# or
bun add bambu-link
```

## Quick Start

Import the BambuLink client:
```javascript
import { BambuLink } from 'bambu-link';
```

Create a new client instance:
```javascript
const client = new BambuLink(
    accessToken,    // Access token from printer network settings
    host,           // IP address of the printer
    0,              // Sequence start (0 for single client)
    8883,           // Port (default: 8883)
    serial          // Serial number from printer settings
);
```

Connect to the printer:
```javascript
client.connect();
```

## Events

The BambuLink client uses an event-based architecture. Listen for events using the `.on()` method:

### `connect`
Emitted when successfully connected to the printer.
```javascript
client.on('connect', () => {
    console.log('Connected to printer');
});
```

### `data`
Emitted for all incoming messages from the printer.
```javascript
client.on('data', (topic, message) => {
    console.log('Received data:', message);
});
```

### `state`
Emitted when the printer state is updated with the full current state.
```javascript
client.on('state', (state) => {
    console.log('Current state:', state);
});
```

### `stateUpdate`
Emitted with only the changed parts of the state.
```javascript
client.on('stateUpdate', (patch, previousState) => {
    console.log('State changes:', patch);
});
```

### `error`
Emitted when an error occurs.
```javascript
client.on('error', (err) => {
    console.error('Error:', err);
});
```

## State Management

The client automatically tracks and validates printer state using Zod schemas. Access the current state at any time:

```javascript
const state = client.getFullState();
```

The `PrinterState` object includes:
- `temps` - Temperatures (nozzle, bed, chamber)
- `fans` - Fan speeds (part, chamber, aux, heatbreak)
- `lights` - Light states (chamber, work)
- `job` - Current job info (stage, progress, remaining time, file)
- `ams` - AMS (Automatic Material System) state and trays
- `ipcam` - Camera settings
- `upgrade` - Firmware update status
- `network` - Network information
- And more...

## Sending Commands

All command methods return a Promise that resolves when the command is acknowledged by the printer.

### Print Control

#### `stopPrint()`
Stops the current print job.
```javascript
await client.stopPrint();
```

#### `pausePrint()`
Pauses the current print job.
```javascript
await client.pausePrint();
```

#### `resumePrint()`
Resumes a paused print job.
```javascript
await client.resumePrint();
```

#### `printSpeedSet(speedPct)`
Sets the print speed level.
- `speedPct`: `1` = silent, `2` = standard, `3` = sport, `4` = ludicrous
```javascript
await client.printSpeedSet(2); // Set to standard speed
```

#### `printGcode_file(fileName)`
Starts printing a gcode file from the printer's storage.
- `fileName`: Absolute path to the gcode file on the printer
```javascript
await client.printGcode_file('/path/to/file.gcode');
```

#### `printGcode(gcode)`
Sends raw gcode commands directly to the printer. more info on gcode commands can be found in [this repository](https://github.com/Doridian/OpenBambuAPI/blob/main/gcode.md)
- `gcode`: Gcode string to execute
```javascript
await client.printGcode('G28\n'); // Home all axes
```

### `home()`
Sends home command to the printer
```javascript
await client.home();
```

### Maintenance & Calibration

#### `calibration()`
Starts the printer calibration routine.
```javascript
await client.calibration();
```

#### `unloadFilament()`
Initiates the filament unload process.
```javascript
await client.unloadFilament();
```

#### `refreshState()`
Manually requests a full state update from the printer. Note: This should rarely be needed as the printer pushes updates automatically. Calling too frequently can cause lag on P1S models.
```javascript
client.refreshState();
```

### Hardware Control

#### `setFanSpeed(speed, fan)`
Sets the speed of a specific fan.
- `speed`: Fan speed (0-255)
- `fan`: Fan identifier (`'AUX'`, `'CHAMBER'`, or `'PART'`)
```javascript
await client.setFanSpeed(128, 'PART'); // Set part cooling fan to 50%
await client.setFanSpeed(0, 'CHAMBER'); // Turn off chamber fan
```

#### `move(axis, distance, feedrate)`
Moves the specified axis by the given distance.
⚠️ **WARNING**: This command could bypass endstops. Use with caution.
- `axis`: Axis to move (`'X'`, `'Y'`, or `'Z'`)
- `distance`: Distance to move in millimeters
- `feedrate`: Movement speed in mm/min (default: 9000)
```javascript
await client.move('Z', 10, 3000); // Move Z axis up 10mm at 3000mm/min
```

#### `ledSet(mode, node, flashing)`
Controls the printer LED lights.
- `mode`: `'off'`, `'on'`, or `'flashing'`
- `node`: Light to control (`'chamber_light'` or `'work_light'`)
- `flashing`: Optional flashing parameters (only used when mode is `'flashing'`)
  - `led_on_time`: Duration in ms (default: 500)
  - `led_off_time`: Duration in ms (default: 500)
  - `loop_times`: Number of flash cycles (default: 1)
  - `interval`: Interval between cycles in ms (default: 1000)
```javascript
// Turn on chamber light
await client.ledSet('on', 'chamber_light');

// Flash work light 3 times
await client.ledSet('flashing', 'work_light', {
    led_on_time: 200,
    led_off_time: 200,
    loop_times: 3,
    interval: 500
});

// Turn off chamber light
await client.ledSet('off', 'chamber_light');
```

## Example

Basic example connecting to the printer and monitoring temperature:

```javascript
import { BambuLink } from 'bambu-link';
import 'dotenv/config';

if (!process.env.access_token || !process.env.host || !process.env.serial) {
    console.error('Please set the access_token, host, and serial environment variables');
    process.exit(1);
}

const client = new BambuLink(
    process.env.access_token,  // Token from printer network settings
    process.env.host,          // IP address (recommend using static IP)
    0,                         // Sequence start
    8883,                      // Port (default: 8883)
    process.env.serial         // Serial from printer settings
);

client.on('connect', () => {
    console.log('Connected to printer via MQTT');
});

client.on('error', (err) => {
    console.error('Error:', err);
});

client.on('stateUpdate', (patch) => {
    if (patch.temps) {
        console.log('Temperature update:', patch.temps);
    }
});

client.on('state', (state) => {
    // Access full state
    console.log('Bed temp:', state.temps.bed);
    console.log('Nozzle temp:', state.temps.nozzle);

    if (state.job?.percent) {
        console.log('Job progress:', state.job.percent + '%');
    }
});

client.connect();
```

## API Reference

<!-- TODO: Add comprehensive API documentation -->

### Constructor
```javascript
new BambuLink(accessToken, host, sequenceStart, port, serial)
```

### Methods
- `connect()` - Connect to the printer
- `disconnect()` - Disconnect from the printer
- `getFullState()` - Get the current printer state
- `getMqttClient()` - Get the underlying MQTT client

### Events
- `connect` - Connected to printer
- `data` - Raw data received
- `state` - Full state update
- `stateUpdate` - Partial state update (delta)
- `error` - Error occurred

## Contributing

This project is still in active development. Contributions are welcome!

## License

MIT
