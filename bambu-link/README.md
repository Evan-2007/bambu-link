# bambu-link
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
``` javascript
import { bambuClient } from 'bambu-link'
```
\
Connect to the printer
``` javascript
    const client = bambuClient({
        hostname,
        token,
        serial,
        port: 8883
    })
```
\
Read messages using 
``` javascript
    client.service.on('message', (topic, message) => {
        console.log(message.toString())
    })
```
\
Sent messages to the printer using
``` javascript
    const actions = await client.actions;

    actions.pushAll() //Lists current status of printer
    actions.getVersion() //Lists version of printer
    actions.chamberLightOff() //Turns off chamber light
    actions.chamberLightOn() //Turns on chamber light
```

Alot more actions will come soon


### Example
Replace token, serial, hostname with information from your printer

``` javascript
import { bambuClient } from 'bambu-link'

export async function main() {
    
    const token = '12345678' //token is found in the printer network settings
    const serial = '01P00A000000000' //serial is found in the printer settings
    const hostname = '192.168.0.1' //Ip address of the printer. Ip addresses can change so it is recommended to set a static ip address

    const client = bambuClient({
        hostname, //Ip address of the printer. Ip addresses can change so it is recommended to set a static ip address for the printer
        token,
        serial,
        port: 8883 //Port number for the printer. Default is 8883 and should not be chnaged unless nessesary
    })

    client.service.on('message', (topic, message) => {
        console.log(message.toString()) //Logs the message from the printer.
    })

    const actions = await client.actions; //wait for connection to be established before sending commands

    actions.pushAll() //Lists current status of printer. The printer will send messages as the status changes this only needs to be called once
    actions.getVersion() //Lists version of printer
    actions.chamberLightOff() //Turns off chamber light
    actions.chamberLightOn() //Turns on chamber light
}
```