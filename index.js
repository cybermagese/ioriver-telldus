'use strict';

const { LocalApi } = require('telldus-api');

/**
 * @name ioriver-telldus
 * @description ioriver plugin for Telldus local api
 * @returns this module returns a class instance on IORiverTelldus. Call init(), run(), shutdown() to setup, run and stop 
 * @author Ove Jansson <ove@cybermage.se>
 */

class IORiverTelldus {
    
    constructor() {
        this.system = {};
        this.sensors = {};
        this.devices = {};
        this.list = {};
        this.listTimeStamp = 0;
        this.methods = {
            on: 0x0001, // 1
            off: 0x0002, // 2
            bell: 0x0004, // 4
            toggle: 0x0008, // 8
            dim: 0x0010, // 16
            learn: 0x0020, // 32
            execute: 0x0040, // 64
            up: 0x0080, // 128
            down: 0x0100, // 256
            stop: 0x0200, // 512
          };
    }

    /**
     * @method init
     * @description set up the plugin
     * @param {*} platformconfig this platform config in ioriver's config.json
     * @param {*} ioriver_api ioriver's api for plugins
     * @param {*} log general logging
     */
    async  init(platformconfig, ioriver_api, log) {
        this.config = platformconfig;
        this.log = log;
        this._api = ioriver_api;

        this.log.debug(`Init IORiverTelldus with config=`);
        this.log.debug(this.config);

        if(!this.config.ip || !this.config.access_token) {
            this.log.error("No config for Telldus! please include \"ip\"=\"<TELLSTICK_IP_ADDRESS>\" and \"access_token\"=\"<TELLSTICK_LOCAL_API_SECRET>\" under platforms in config.json");
            return false;
        }
        let host = this.config.ip;
        let accessToken = this.config.access_token;

        this.api = await new LocalApi({ host, accessToken });
        this.log.debug(`LocalApi is loaded`);

        //get system
        this.system = await this.request({ path: '/system/info' });
        this.log.debug('System/Info = ');
        this.log.debug(this.system);

        //get all the devices
        this.getList();
        
        //todo: registerPlatform when we are done
    }

    async getList() {
        this.sensors = await this.api.listSensors();
        this.log.debug('Sensor/List = ');
        this.log.debug(this.sensors);

        for(let i=0; i < this.sensors.length; i++) {
            if(typeof this.config.ignore_id_list !== 'undefined' && Array.isArray(this.config.ignore_id_list)) {
                this.sensors[i]._ignore = this.config.ignore_id_list.includes(this.sensors[i].id);
            }
            this.sensors[i].info = await this.api.getSensorInfo(this.sensors[i].id);
            this.log.debug(this.sensors[i].info);
            //todo:handle errors
        }


        this.devices = await this.api.listDevices();
        this.log.debug('Device/List = ');
        this.log.debug(this.devices);

        for(let i=0; i<this.devices.length; i++) {
            if(typeof this.config.ignore_id_list !== 'undefined' && Array.isArray(this.config.ignore_id_list)) {
                this.devices[i]._ignore = this.config.ignore_id_list.includes(this.devices[i].id);
            }
            this.devices[i].info = await this.api.getDeviceInfo(this.devices[i].id);
            this.log.debug(this.devices[i].info);
            //todo:handle errors

        }


    }
}

module.exports = new IORiverTelldus(); 
