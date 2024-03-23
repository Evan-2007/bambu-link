import mqqt from 'mqtt'
import { actions, ActionsType } from './actions'
import { BambuClientType } from './types'

function connect({hostname, port = 8883, token, serial}: {hostname: string, port?: number, token: string, serial: string}) {
    const mqqtClient = mqqt.connect(`mqtts://${hostname}:${port}`, {
        username: "bblp",
        password: token,
        reconnectPeriod: 1,
        rejectUnauthorized: false
    }
    )

    let connected = false
    console.log('connecting')
    mqqtClient.on('connect', () => {
        mqqtClient.subscribe(`device/${serial}/report` , (err: any) => {
            if (err) {
                console.log('error subscribing', err)
            }
            else {
                console.log('Getting status')
                connected = true
            }
        })
    })

    function useActions(): Promise<ActionsType> {
        return new Promise((resolve, reject) => {
            const checkConnected = setInterval(() => {
                if (connected) {
                    clearInterval(checkConnected);
                    resolve(actions(mqqtClient, serial) as ActionsType); // Assuming `actions` returns the correct object.
                }
            }, 100);
        });
    }
    return {
        service: mqqtClient,
        actions: useActions()
    }
}

export {connect}

