import { connect, MqttClient, IClientOptions } from 'mqtt';
import { EventEmitter } from 'events';


// Type for the 'resolve' function of a Promise,
// which we will store to await a response.
type PendingCommandResolver = (response: any) => void;


/**
 * Manages an MQTT connection for data streaming and command-response cycles.
 *
 * Emits:
 * - 'connect': When successfully connected to the broker.
 * - 'data': (topic: string, message: any) - For all incoming data updates.
 * - 'error': (error: Error) - On connection errors.
 */
export class MqttStreamClient extends EventEmitter {
  private client: MqttClient | null = null;
  private brokerUrl: string;
  private clientOptions: IClientOptions;


  private dataUpdateTopic: string;

  private sequenceCounter = 0;
  private pendingCommands = new Map<number, PendingCommandResolver>();
  private commandTimeoutMs: number;

  constructor(
    brokerUrl: string,
    dataUpdateTopic: string,
    options: IClientOptions = {},
    commandTimeoutMs: number = 10000 // 10-second timeout
  ) {
    super();
    this.brokerUrl = brokerUrl;
    this.clientOptions = options;
    this.dataUpdateTopic = dataUpdateTopic;
    this.commandTimeoutMs = commandTimeoutMs;
  }

  /**
   * Connect to the MQTT broker and set up listeners.
   */
  public connect(): void {
    this.client = connect(this.brokerUrl, this.clientOptions);

    this.client.on('error', (err) => {
      this.emit('error', err);
    });

    // On successful connection
    this.client.on('connect', () => {
      console.log(`Connected to MQTT broker at ${this.brokerUrl}`);

      // Subscribe to the response topic
      this.client?.subscribe(this.dataUpdateTopic, (err) => {
        if (err) {
          console.error('Failed to subscribe to response topic', err);
          this.emit('error', new Error('Failed to subscribe to response topic'));
        }
      });


      console.log(`Subscribed to topic: ${this.dataUpdateTopic}`);
      this.emit('connect');
    });


    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload);
    });

    // Handle errors
    this.client.on('error', (err) => {
      console.error('MQTT Client Error:', err);
      this.emit('error', err);
    });

    // Handle disconnection
    this.client.on('close', () => {
      console.log('MQTT connection closed.');
    });
  }

  /**
   * Disconnect the client.
   */
  public disconnect(): void {
    this.client?.end();
  }

  /**
  * Routes incoming messages to the correct handler.
  */
  private handleMessage(topic: string, payload: Buffer): void {
    const messageStr = payload.toString();
    let message: any;
    //console.log(`Received message on topic ${topic}: ${messageStr}`);

    try {
      message = JSON.parse(messageStr);
    } catch (e) {
      console.warn(`Received non-JSON message on ${topic}: ${messageStr}`);
      return;
    }

    // Check if it's a command response
    if (message.print?.upgrade_state?.sequence_id <= this.sequenceCounter) {
      //console.log(message.print.upgrade_state);
      this.handleCommandResponse(message);
    }
    else {
      /**
       * Emits a 'data' event.
       * @event data
       * @type {object}
       * @property {string} topic - The topic the data came from.
       * @property {any} message - The parsed JSON message.
       */
      this.emit('data', { topic, message });
    }
  }

  /**
   * Handles messages on the response topic.
   */
  private handleCommandResponse(response: any): void {
    console.log(this.pendingCommands)
    const seq = response.print?.upgrade_state?.sequence_id;

    if (seq && this.pendingCommands.has(seq)) {
      const resolver = this.pendingCommands.get(seq);
      resolver?.(response); 
      this.pendingCommands.delete(seq);
    } else {
      console.warn(`Received response with unknown sequence: ${seq}`);
      // emit response as a normal data message
      this.emit('data', { topic: this.dataUpdateTopic, message: response });
    }
  }

  /**
   * Sends a command and waits for a response with a matching sequence number.
   * @param command The command object to send.
   * @param sequenceId The sequence ID for this command.
   * @returns A Promise that resolves with the response or rejects on timeout.
   */
  public sendCommand(command: string, sequenceId: number): Promise<any> {
    if (!this.client || !this.client.connected) {
      return Promise.reject(new Error('MQTT client not connected.'));
    }
    console.log(`Sending command: ${command} with sequence ID: ${sequenceId}`);

    const sequenceNumber = sequenceId;

    return new Promise((resolve, reject) => {
      this.pendingCommands.set(sequenceNumber, resolve);

      const timeout = setTimeout(() => {
        this.pendingCommands.delete(sequenceNumber); // Clean up
        reject(new Error(`Command timeout for sequence ${sequenceNumber}`));
      }, this.commandTimeoutMs);

      this.client?.publish(this.dataUpdateTopic, command, (err) => {
        if (err) {
          this.pendingCommands.delete(sequenceNumber);
          clearTimeout(timeout);
          reject(err);
        }
      });
    });
  }
}