'use strict';

//const { LocalApi, LiveApi } = require('telldus-api');



class IORiverTelldus {
    
    constructor() {
        this.list = {};
        this.listTimeStamp = 0;
    }

    async  init(platformconfig,ultrabridge_api,log) {
        this.config = platformconfig;
        this.log = log;
        this._api = ultrabridge_api;

        if(!this.config.ip || !this.config.accessToken) {
            this.log.error("No config for Telldus! please include \"ip\"=\"<TELLSTICK_IP_ADDRESS>\" and \"accessToken\"=\"<TELLSTICK_LOCAL_API_SECRET>\" under platforms in config.json");
            return false;
        }
        let host = this.config.ip;
        let accessToken = this.config.accessToken;

        //this.api = await new LocalApi({ host, accessToken });
        
    }
}

module.exports = new IORiverTelldus(); 
