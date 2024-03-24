declare global {
    namespace NodeJS {
        interface ProcessEnv {
            SERIAL: string;
            TOEKN: string;
            HOSTNAME: string;
        }
    }
}