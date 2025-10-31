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

<!-- TODO: Document command API once implemented -->
TODO

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
