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

        this.supported_products = {"tellstick-znet-lite-v2":"^1.1.1"};

        this.types = { // here for future use these are only for Live! at the moment
            "unknown/other" : "00000000-0001-1000-2005-ACCA54000000",
            "alarm Sensor" : "00000001-0001-1000-2005-ACCA54000000",
            "container" : "00000002-0001-1000-2005-ACCA54000000",
            "controller" : "00000003-0001-1000-2005-ACCA54000000",
            "door/Window" :	"00000004-0001-1000-2005-ACCA54000000",
            "light" : "00000005-0001-1000-2005-ACCA54000000",
            "lock" : "00000006-0001-1000-2005-ACCA54000000",
            "media" : "00000007-0001-1000-2005-ACCA54000000",
            "meter" : "00000008-0001-1000-2005-ACCA54000000",
            "motion" : "00000009-0001-1000-2005-ACCA54000000",
            "on/off sensor" : "0000000A-0001-1000-2005-ACCA54000000",
            "person" : "0000000B-0001-1000-2005-ACCA54000000",
            "remote control" : "0000000C-0001-1000-2005-ACCA54000000",
            "sensor" : "0000000D-0001-1000-2005-ACCA54000000",
            "smoke sensor" : "0000000E-0001-1000-2005-ACCA54000000",
            "speaker" : "0000000F-0001-1000-2005-ACCA54000000",
            "switch/outlet" : "00000010-0001-1000-2005-ACCA54000000",
            "thermostat" : "00000011-0001-1000-2005-ACCA54000000",
            "virtual" : "00000012-0001-1000-2005-ACCA54000000",
            "window covering" : "00000013-0001-1000-2005-ACCA54000000",
            "projector screen" : "00000014-0001-1000-2005-ACCA54000000"
        };

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

        this.nameUnit = {
            "temp": "°C",
            "humidity": "%",
            "wdir": "°",
            "dewp": "°C",
            "barpres": "kPa",
            "wgust": "m/s",
            "wavg": "m/s"
        }
    }

    //REQUIRED EXTERNAL AND API METHODS

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

        this.baseSn = (this.config.sn_x1000 * 1000) + this._api.baseSn;

        if(!this.config.ip || !this.config.access_token) {
            this.log.error("No config for Telldus! please include \"ip\"=\"<TELLSTICK_IP_ADDRESS>\" and \"access_token\"=\"<TELLSTICK_LOCAL_API_SECRET>\" under platforms in config.json");
            return false;
        }
        let host = this.config.ip;
        let accessToken = this.config.access_token;

        this.api = await new LocalApi({ host, accessToken });
        this.log.debug(`LocalApi is loaded`);

        //get system
        this.system = await this.api.request({ path: '/system/info' });
        this.log.debug('System/Info = ');
        this.log.debug(this.system);
        if(!this.system.product && !this.supported_products[this.system.product]){
            this.log.warn(`${this.system.product} is not in the supported products list.`);
        } else {
            //todo: check version of product
        }

        //get all the devices
        this.getList();
        
        //todo: registerPlatform when we are done
    }

    

    // INTERNAL METHODS

    getIdfromSn(Sn){
        let id = Sn-this.baseSn;
        this.log.debug(`Return Id=${id} from Sn=${Sn}`);
        return id;
    }

    async getList() {
        this.sensors = await this.api.listSensors();
        this.log.debug('Sensor/List = ');
        this.log.debug(this.sensors);

        for(let i=0; i < this.sensors.length; i++) {
            if(typeof this.config.ignore_id_list !== 'undefined' && Array.isArray(this.config.ignore_id_list)) {
                this.sensors[i]._ignore = this.config.ignore_id_list.includes(this.sensors[i].id);
            }
            if(!this.sensors[i].name) {
                this.sensors[i]._ignore = true;
            }
            var thisSensor = await this.api.getSensorInfo(this.sensors[i].id);
            this.sensors[i].info = await thisSensor;
            
            //if it doesn't exist create it
            if(!this.sensors[i]._ignore && !this.list[thisSensor.id + this.baseSn]) {
                this.log.debug(`Making sensor ${thisSensor.id + this.baseSn}`);
                var item = await this.makeSensor(this.sensors[i]);
                this.list[item.Sn] = await item;
                
                this._api.registerDevice(item, this);
            } else {
                this.log.debug(`Not registering sensor id = ${this.sensors[i].id}`);
            }
            
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
            if(!this.devices[i].name) { //remove ignored devices
                this.devices[i],_ignore =true;
            }
            var thisDevice = await this.api.getDeviceInfo(this.devices[i].id);
            this.devices[i].info = await thisDevice;

            //if it doesn't exist create it
            if(!this.devices[i]._ignore && !this.list[thisDevice.id + this.baseSn]) {
                this.log.debug(`Creating device ${thisDevice.name} ${thisDevice.id + this.baseSn}.`);
                var item = await this.makeDevice(this.devices[i]);
                this.list[item.Sn] = await item;
                this._api.registerDevice(item,this);
            }
            
            this.log.debug(this.devices[i].info);
            //todo:handle errors
        }



    }

    async makeDevice(data) {
        var proto = {};
        proto.type = "device";
        proto.Sn = this.baseSn + data.id;
        proto.name = data.name;

        if(data.battery) {
            proto.battery = data.battery/255; //convert to %
        }

        proto.methods = {
            on: ((data.methods & this.methods.on) === this.methods.on),
            off: ((data.methods & this.methods.off) === this.methods.off),
            dim: ((data.methods & this.methods.dim) === this.methods.dim),
            up: ((data.methods & this.methods.up) === this.methods.up),
            down: ((data.methods & this.methods.down) === this.methods.down),
            stop: ((data.methods & this.methods.stop) === this.methods.stop),
            toggle: ((data.methods & this.methods.toggle) === this.methods.toggle),
            bell: ((data.methods & this.methods.bell) === this.methods.bell)
        }

        proto.state = this.getMethod(data.state);
        proto.value = data.info.statevalue/255;

        return proto;

    }

    getMethod(number) {
        for(var m in this.methods) {
            if(number === this.methods[m]) {
                return m;
            }
        }
        return undefined;
    }

    async makeSensor(data) {
        this.log.debug(`makeSensor(data)=`);
        this.log.debug(data);
        var proto = {};
        proto.type = "sensor";
        proto.Sn = this.baseSn + data.id;
        proto.name = data.name;

        if(data.battery) {
            proto.battery = data.battery/255; //convert to %
        }

        proto.inputs = [];
        var d = data.info.data;
        for(var i = 0; i < d.length; i++) {
            if(d[i].name) {
                let thisData = {};
                thisData.name = d[i].name;
                thisData.value = d[i].value;
                
                //todo: override unit with platform config
                if(this.nameUnit[d[i].name]) {
                    thisData.unit = this.nameUnit[d[i].name];
                }

                proto.inputs[i] = thisData;
            }
        }

        
        return proto;
    }
}

module.exports = new IORiverTelldus(); 
