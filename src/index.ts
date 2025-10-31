import { BambuLink } from "./client";
import * as dotenv from "dotenv";

dotenv.config();

export {BambuLink } from "./client";
export { Message as MessageType } from "./types/printerResponse";



// For direct execution (e.g., for testing)
declare const require: any;
declare const module: any;

    if (typeof require !== 'undefined' && require.main === module) {
        if (!process.env.access_token || !process.env.host || !process.env.serial) {
            console.error("Please set the access_token, host, and serial environment variables.");
            process.exit(1);
        }
      (async () => {
        console.log("Starting BambuLink client...");
        const client = new BambuLink(process.env.access_token!, process.env.host!, 0, 8883, process.env.serial!);
        client.connect();
        client.on('connect', () => {
          console.log('Connected to printer via MQTT');
        });

        client.on('error', (err) => {
          console.error('Error:', err);
        });

        client.on('data', (data) => {
          //console.log('Data received:', data);
          //console.log(client.getFullState());
        });

        client.on('stateUpdate', (state) => {
          //console.log('State updated:', state);
        });

        client.on('state', (state) => {
          console.log('State changed:', state);
        });
      })();
    }