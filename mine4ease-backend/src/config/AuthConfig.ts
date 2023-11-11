import {LogLevel} from "@azure/msal-node";

const AAD_ENDPOINT_HOST = "https://login.microsoftonline.com/"; // include the trailing slash
export const REDIRECT_URI = "mine4ease://auth";

export const msalConfig = {
  auth: {
    clientId: "39c0e527-3860-4041-b89d-1b6b7bd3cf87",
    authority: `${AAD_ENDPOINT_HOST}consumers`,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel: LogLevel, message: string, containsPii: any) {
        if(loglevel == LogLevel.Info) {
          console.log(message);
        }
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Verbose,
    },
  },
};
