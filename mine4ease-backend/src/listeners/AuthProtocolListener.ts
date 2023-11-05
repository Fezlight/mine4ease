import {protocol} from "electron";

export class AuthProtocolListener {
  hostName;

  constructor(hostName) {
    this.hostName = hostName;
  }

  get host() {
    return this.hostName;
  }

  /**
   * Registers a custom string protocol on which the library will
   * listen for Auth Code response.
   */
  start() {
    return new Promise((resolve, reject) => {
      protocol.registerStringProtocol(this.host, (req, callback) => {
        const requestUrl = new URL(req.url);
        const authCode = requestUrl.searchParams.get("code");
        if (authCode) {
          resolve(authCode);
        } else {
          protocol.unregisterProtocol(this.host);
          reject(new Error("No code found in URL"));
        }
      });
    });
  }

  /**
   * Unregisters a custom string protocol to stop listening for Auth Code response.
   */
  close() {
    protocol.unregisterProtocol(this.host);
  }
}
