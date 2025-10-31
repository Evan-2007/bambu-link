import { connect, MqttClient, IClientOptions } from 'mqtt';
import { EventEmitter } from 'events';


interface IMqttCommand {
  action: string;
  payload: any;
}

// Interface for the expected response
// The 'sequenceNumber' is critical
interface IMqttResponse {
  sequenceNumber: number;
  success: boolean;
  data?: any;
  error?: string;
}

// Type for the 'resolve' function of a Promise,
// which we will store to await a response.
type PendingCommandResolver = (response: IMqttResponse) => void;


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

  // Topics
  private dataUpdateTopic: string;
  private commandTopic: string;
  // Command-Response tracking
  private sequenceCounter = 0;
  private pendingCommands = new Map<number, PendingCommandResolver>();
  private commandTimeoutMs: number;

  constructor(
    brokerUrl: string,
    dataUpdateTopic: string,
    commandTopic: string,
    options: IClientOptions = {},
    commandTimeoutMs: number = 10000 // 10-second timeout
  ) {
    super();
    this.brokerUrl = brokerUrl;
    this.clientOptions = options;
    this.dataUpdateTopic = dataUpdateTopic;
    this.commandTopic = commandTopic;
    this.commandTimeoutMs = commandTimeoutMs;
  }

  /**
   * Connects to the MQTT broker and sets up listeners.
   */
  public connect(): void {
    this.client = connect(this.brokerUrl, this.clientOptions);

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
   * Disconnects the client.
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

    try {
      message = JSON.parse(messageStr);
    } catch (e) {
      console.warn(`Received non-JSON message on ${topic}: ${messageStr}`);
      return;
    }

    // Check if it's a command response
    if (message.sequenceNumber <= this.sequenceCounter) {
      this.handleCommandResponse(message as IMqttResponse);
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
  private handleCommandResponse(response: IMqttResponse): void {
    const seq = response.sequenceNumber;

    if (seq && this.pendingCommands.has(seq)) {
      const resolver = this.pendingCommands.get(seq);
      resolver?.(response); 
      this.pendingCommands.delete(seq); // Clean up
    } else {
      console.warn(`Received response with unknown sequence: ${seq}`);
    }
  }

  /**
   * Sends a command and waits for a response with a matching sequence number.
   *
   * @param command The command object to send.
   * @returns A Promise that resolves with the response or rejects on timeout.
   */
  public sendCommand(command: IMqttCommand): Promise<IMqttResponse> {
    if (!this.client || !this.client.connected) {
      return Promise.reject(new Error('MQTT client not connected.'));
    }

    this.sequenceCounter += 1;
    const sequenceNumber = this.sequenceCounter;

    const message = {
      ...command,
      sequenceNumber,
    };

    return new Promise((resolve, reject) => {
      this.pendingCommands.set(sequenceNumber, resolve);

      const timeout = setTimeout(() => {
        this.pendingCommands.delete(sequenceNumber); // Clean up
        reject(new Error(`Command timeout for sequence ${sequenceNumber}`));
      }, this.commandTimeoutMs);

      this.client?.publish(this.commandTopic, JSON.stringify(message), (err) => {
        if (err) {
          this.pendingCommands.delete(sequenceNumber);
          clearTimeout(timeout);
          reject(err);
        }
      });
    });
  }
}