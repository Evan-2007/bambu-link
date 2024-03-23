interface MQTTMessage {
    toString(): string;
}

interface ActionsType {
    pushAll: () => void;
    getVersion: () => void;
    chamberLightOff: () => void;
    chamberLightOn: () => void;
}

export interface BambuClientType {
    service: {
        on: (event: string, callback: (topic: string, message: MQTTMessage) => void) => void;
        // Add other properties and methods as relevant...
    };
    actions: Promise<ActionsType>;
}
