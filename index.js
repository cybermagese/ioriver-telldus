'use strict';

//const { LocalApi, LiveApi } = require('telldus-api');

/**
 * @name ioriver-telldus
 * @description ioriver plugin for Telldus local api
 * @returns this module returns a class instance on IORiverTelldus. Call init(), run(), shutdown() to setup, run and stop 
 * @author Ove Jansson <ove@cybermage.se>
 * @version 0.1.1
 */

class IORiverTelldus {
    
    constructor() {
        this.list = {};
        this.listTimeStamp = 0;
    }

    /**
     * @method init
     * @description set up the plugin
     * @param {*} platformconfig 
     * @param {*} ultrabridge_api 
     * @param {*} log 
     */
    async  init(platformconfig,ultrabridge_api,log) {
        this.config = platformconfig;
        this.log = log;
        this._api = ultrabridge_api;

        this.log.debug(`Init IORiverTelldus with config=`);
        this.log.debug(platformconfig);

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
