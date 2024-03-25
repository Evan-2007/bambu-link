[# bambu-link

A node module for communicating with bambulab printers. Currently still a work in progress.
Only tested on p1s

## Installation

\
Install the npm package

```bash
npm i bambu-link
# or
yarn add bambu-link
# or
pnpm add bambu-link
# or
bun add bambu-link
```

\
Then import bambuclient

```javascript
import { connect } from "bambu-link";
```

\
Connect to the printer

```javascript
const client = connect({
  hostname,
  token,
  serial,
  port: 8883,
});
```

\
Read messages using

```javascript
client.service.on("message", (topic, message) => {
  console.log(message.toString());
});
```

\
Sent messages to the printer using

```javascript
const actions = await client.actions;

actions.system.pushAll(); //Lists current status of printer
actions.system.chamberLightOff(); //Turns off chamber light
actions.system.chamberLightOn(); //Turns on chamber light
actions.gcode.fanSpeed(AUX, 255); //sets the aux fan to max
```

\

## Actions

first wait for for connection to the printer with

```javascript
const actions = await client.actions;
```

## System

System actions can be called using `actions.system.actionName()`

### Avalable system actions

- `pushAll()` Returns current information about the printer
- `getVersion()` Returnes information about the printer version
- `chamberLightOn()`, `chamberLightOff()` Turnes on and off the chamber light

## Gcode

Gcode actions can be called using `actions.gcode.actionName()`

### Avalable gcode actions

- `fanSpeed(fan, speed)` fan can be CHAMBER, PART, or AUX. speed can be any number between 0 and 225
- `tempControl(tool, temp)` tool can be BED or EXTRUDER. temp is the target temperature in celsius

## Example

This example connects to the printer, turnes the light on and, heats the bed to 60 and then waits for it to reach that temp

```javascript
import { connect, MessageType } from 'bambu-link'
import 'dotenv/config'

export async function main() {
    if (typeof process.env.TOKEN === 'undefined' || typeof process.env.SERIAL === 'undefined' || typeof process.env.HOSTNAME === 'undefined') {
        console.error('Please set the TOEKN, SERIAL, and HOSTNAME environment variables')
        process.exit(1)
    }

    const token = process.env.TOKEN //token is found in the printer network settings
    const serial = process.env.SERIAL //serial is found in the printer settings
    const hostname = process.env.HOSTNAME //Ip address of the printer. Ip addresses can change so it is recommended to set a static ip address for the printer

    const client = connect({
        hostname,
        token,
        serial,
        port: 8883 //Port number for the printer. Default is 8883 and should not be chnaged unless nessesary
    })


    let currentTemp = 0
    client.service.on('message', (topic, message) => {

        const messageString  = message.toString(); //convert the message to a string
        const json: MessageType = JSON.parse(messageString) //parse the message to a json object and type it as MessageType
        console.log(json) //log the json object to the console

        if(typeof json.print?.bed_temper !== "undefined") {
            currentTemp = json.print.bed_temper //set the current temp to the bed temp if it is defined
        }

    })

    const actions = await client.actions; //wait for connection to be established before sending commands

    actions.system.pushAll() //request initial printer state

    const temp = 60
    actions.gcode.tempControl('BED', temp) //set the bed temp to 60 degrees

    while (currentTemp < temp) { //wait untill the bed temp reaches 60 degrees
        console.log('Current Temp:', currentTemp)
        await new Promise(resolve => setTimeout(resolve, 1000)) //wait for 1 second untill checking the temp again
    }
    console.log('Reached Temp:', currentTemp)

}

main()

```

](../README.md)
