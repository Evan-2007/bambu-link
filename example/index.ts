import { connect, MessageType } from 'bambu-link' 
import 'dotenv/config'

export async function main() {
    if (typeof process.env.TOKEN === 'undefined' || typeof process.env.SERIAL === 'undefined' || typeof process.env.HOSTNAME === 'undefined') {
        console.error('Please set the TOEKN, SERIAL, and HOSTNAME environment variables')
        process.exit(1)
    }

    const token = process.env.TOKEN //This is a placeholder token. token is found in the printer network settings
    const serial = process.env.SERIAL //This is a placeholder serial number. serial is found in the printer settings
    const hostname = process.env.HOSTNAME //Ip address of the printer. Ip addresses can change so it is recommended to set a static ip address for the printer

    const client = connect({
        hostname, //Ip address of the printer. Ip addresses can change so it is recommended to set a static ip address for the printer
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



        if (json.print?.command ==='gcode_line') {
        //    console.log(json)
        }

        if (json.print?.hms !== undefined) {
            console.log(json.print.hms)
        }

    })

    const actions = await client.actions; //wait for connection to be established before sending commands


    actions.system.pushAll() //request initial printer state
    actions.gcode.home() //home the printer
    actions.gcode.move('X', 20.0) //move the x axis 10mm

//     const temp = 60
//     actions.gcode.tempControl('BED', temp) //set the bed temp to 60 degrees

//     while (currentTemp < temp) { //wait untill the bed temp reaches 60 degrees
//         console.log('Current Temp:', currentTemp)
//         await new Promise(resolve => setTimeout(resolve, 1000)) //wait for 1 second untill checking the temp again
//     }
//     console.log('Reached Temp:', currentTemp)

}

main()

