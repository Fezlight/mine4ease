import {protocol} from "electron";
import {EventListeners} from "./EventListeners.ts";

export class AuthProtocolListener implements EventListeners {
  hostName: string;

  constructor(hostName: string) {
    this.hostName = hostName;
  }

  get host() {
    return this.hostName;
  }

  start() {
    return new Promise((resolve, reject) => {
      protocol.handle(this.host, (request: Request) => {
        const requestUrl = new URL(request.url);
        const authCode = requestUrl.searchParams.get("code");
        if (authCode) {
          resolve(authCode);
        } else {
          protocol.unhandle(this.host);
          reject(new Error("No code found in URL"));
        }

        return new Response();
      });
    });
  }

  stop() {
    protocol.unhandle(this.host);
  }
}
