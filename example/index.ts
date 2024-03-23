import { bambuClient } from 'bambu-node'

export async function main() {
    
    const token = '12345678' //This is a placeholder token. token is found in the printer network settings
    const serial = '01P00A000000000' //This is a placeholder serial number. serial is found in the printer settings
    const hostname = '192.168.0.1' //Ip address of the printer. Ip addresses can change so it is recommended to set a static ip address for the printer

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

main()

//run with pnpm ts-node-esm index.ts
