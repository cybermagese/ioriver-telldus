
'use strict';

const { LocalApi } = require('telldus-api');

/**
 * @name ioriver-telldus
 * @description ioriver plugin for Telldus local api
 * @returns this module returns a class instance on IORiverTelldus. 
 * init() to setup devices, 
 * run() to update devices, 
 * shutdown() stop 
 * @author Ove Jansson <ove@cybermage.se>
 */
class IORiverTelldus {
    
    constructor() {
        this.system = {};
        this.sensors = {};
        
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
            "barpress": "kPa",
            "wgust": "m/s",
            "wavg": "m/s",
            "power": "W",
            "energy": "kWh",
            "current": "A",
            "voltage": "V"
        };

        this.battery = {
            "OK": 253,
            "STATUS_UNKNOWN": 254,
            "LOW":255
        };
    }

    //REQUIRED EXTERNAL AND API METHODS

    /**
     * @method init
     * @description set up the plugin
     * @param {*} platformconfig this platform config in ioriver's config.json
     * @param {*} ioriver_api ioriver's api/event emitter for plugins
     * @param {*} log general logging from server
     */
    async  init(platformconfig, ioriver_api, log) {
        this.config = platformconfig;
        this.log = log;
        this._api = ioriver_api;
        
        //todo:checkplugin against ioriver versions

        this.log.debug(`Init ioiver-telldus with config=`);
        this.log.debug(this.config);

        this.baseSn = (this.config.sn_x1000 * 1000) + this._api.baseSn;

        if(!this.config.ip || !this.config.access_token) {
            this.log.error("No config for Telldus! please include \"ip\"=\"<TELLSTICK_IP_ADDRESS>\" and \"access_token\"=\"<TELLSTICK_LOCAL_API_SECRET>\" under platforms in config.json");
            return false;
        }
        let host = this.config.ip;
        let accessToken = this.config.access_token;

        this.api = await new LocalApi({ host, accessToken });
        this.log.debug(`Telldus LocalApi is loaded`);

        
        this.system = await this.api.request({ path: '/system/info' })
        .catch((e)=>{
            this.log.warn(`ioriver-telldus: Failed to contact controller`);
        });
        this.log.debug('System/Info = ');
        this.log.debug(this.system);
        if(typeof this.system!=='undefined' && typeof this.system.product !== 'undefined' && !this.system.product && !this.supported_products[this.system.product]){
            this.log.warn(`${this.system.product} is not in the supported products list.`);
        } else {
            //todo: check version of product
        }

        //get all the devices
        await this.setupDevices();
        
        //registerPlatform when we are done
        this._api.emit('registerPlatform', this);
    }

    async run() {
        this.log.debug('*** Running ioriver-telldus');
        await this.setupDevices();
        this.log.debug('*** End ioriver-telldus run');
    }


    

    // INTERNAL METHODS

    getIdfromSn(Sn){
        let id = Sn-this.baseSn;
        this.log.debug(`Return Id=${id} from Sn=${Sn}`);
        return id;
    }

    async setupDevices() {
        const log = this.log;
        const startlistSensors = new Date().getTime();
        const sensors = await this.api.listSensors().catch((e)=>{ log.warn(`ioriver-telldus: Failed listSensors()`);});
        let sensorRequestTime = (new Date().getTime())-startlistSensors;
        if(sensorRequestTime>1000){
            this.log.warn(`ioriver-telldus: ${new Date()}listSensors long request time ${sensorRequestTime}`);
            if(sensorRequestTime>10000) {
                await this._api.sleep(60000);
            }else{
                await this._api.sleep(5000);
            }
            
        } else {
            await this._api.sleep(500);
        }
        if(typeof sensors === 'undefined') {
            this.log.warn(`ioriver-telldus: Undefined sensor list!`);
        } else {
            this.log.debug('Sensor/List = ');
            this.log.debug(sensors);

            var length = sensors.length;
            for(let i=0; i < length; i++) {
                const i2=i;
                if(typeof sensors[i] === 'undefined') {
                    this.log.warn(`ioriver-telldus: Undefined sensor ${i}!`);
                } else{
                    if(typeof this.config.ignore_id_list !== 'undefined' && Array.isArray(this.config.ignore_id_list)) {
                        sensors[i]._ignore = this.config.ignore_id_list.includes(sensors[i].id);
                    }
                    if(!sensors[i].name) {
                        sensors[i]._ignore = true;
                    }
                    await this._api.sleep(500);
                    var thisSensor = await this.api.getSensorInfo(sensors[i].id).catch((e)=>{ log.warn(`ioriver-telldus: failed getSensorInfo(${sensors[i2].id})`);});
                    if(typeof thisSensor === 'undefined') {
                        this.log.warn(`ioriver-telldus: Undefined sensor info id ${sensors[i].id}!`);
                    } else {
                        sensors[i].info = thisSensor;

                        if(!sensors[i]._ignore) {
                            var item = await this.makeSensor(sensors[i]);
                            this._api.i = 'ioriver-telldus';
                            this._api.emit('registerDevice', item);
                        } else {
                            this.log.debug(`Ignoring sensor id = ${sensors[i].id}`);
                        }
                    }
                    await this._api.sleep(500);
                }
            
            }
        }

        await this._api.sleep(300);
        const startlistDevices = new Date().getTime();
        const devices = await this.api.listDevices().catch((e)=>{  log.warn(`ioriver-telldus: ${new Date()} failed listDevices()`);});
        var requestTime = (new Date().getTime())-startlistDevices;
        if(requestTime>1000){
            this.log.warn(`ioriver-telldus: ${new Date()}listDevices long request time ${requestTime}`);
            if(requestTime>10000) {
                await this._api.sleep(60000);
            }else{
                await this._api.sleep(30000);
            }
        } else {
            await this._api.sleep(500);
        }
        if(typeof devices==='undefined') {
            this.log.warn(`ioriver-telldus: undefined device`);
        } else {
            this.log.debug('Device/List = ');
            this.log.debug(devices);

            for(let i=0; i<devices.length; i++) {
                const i3=i;
                if(typeof !devices[i] === 'undefined') {
                    this.log.warn(`ioriver-telldus: undefined device ${i}`);
                } else {
                    if(typeof this.config.ignore_id_list !== 'undefined' && Array.isArray(this.config.ignore_id_list)) {
                        this.log.debug(`checking ignore list`);
                        devices[i]._ignore = this.config.ignore_id_list.includes(devices[i].id);
                    }
                    if(!devices[i].name) { //remove ignored devices
                        devices[i]._ignore =true;
                    }
                    await this._api.sleep(500);
                    var thisDevice = await this.api.getDeviceInfo(devices[i].id).catch((e)=>{ log.warn(`ioriver-telldus: failed getDeviceInfo(${devices[i3].id})`); });
                    if(typeof thisDevice === 'undefined') {
                        this.log.warn(`ioriver-telldus: Undefined sensor info id ${devices[i].id}!`);
                    } else {
                        this.log.debug(thisDevice);
                        devices[i].info = thisDevice;

                        if(devices[i] && !devices[i]._ignore) {
                            this.log.debug(`Creating device object for ${thisDevice.name} ${thisDevice.id + this.baseSn}.`);
                            var item2 = await this.makeDevice(devices[i]);
                            this._api.emit('registerDevice',item2);
                        }
                    }
                    await this._api.sleep(500);
                }
            }
        }



    }

    

    async makeDevice(data) {
        var proto = {};
        proto.type = "device"; //depriciated
        proto.isDevice = true;
        proto.Sn = Number(this.baseSn) + Number(data.id);
        proto.name = data.name;

        if(data.battery) {
            if(data.battery>=0 && data.battery<=100) {
                proto.battery = data.battery;
            } else if (data.battery === this.battery.OK) {
                proto.battery = -1;
            } else if (data.battery === this.battery.STATUS_UNKNOWN) {
                proto.battery = -2;
            } else if (data.battery === this.battery.LOW) {
                proto.battery = -3;
            }
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
        };

        proto.state = this.getMethod(data.state);
        proto.value = Math.round(data.info.statevalue/255*100);

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
        proto.type = "sensor"; //depriciated
        proto.isSensor=true;
        proto.Sn = Number(this.baseSn) + Number(data.id);
        proto.name = data.name;

        if(data.battery) {
            if(data.battery>=0 && data.battery<=100) {
                proto.battery = data.battery;
            } else if (data.battery === this.battery.OK) {
                proto.battery = -1;
            } else if (data.battery === this.battery.STATUS_UNKNOWN) {
                proto.battery = -2;
            } else if (data.battery === this.battery.LOW) {
                proto.battery = -3;
            }
        }

        proto.inputs = [];
        var d = data.info.data;
        for(var i = 0; i < d.length; i++) {
            if(d[i].name) {
                let thisData = {};
                if(d[i].name==="watt" && typeof d[i].scale !== 'undefined') {
                    this.log.debug(`watt scale=${d[i].scale} and value=${d[i].value}`);
                    if(d[i].scale===0) {
                        d[i].name = "energy";    
                    } else if(d[i].scale===2) {
                        d[i].name = "power";    
                    } else if(d[i].scale===4) {
                        d[i].name = "voltage";    
                    } else if(d[i].scale===5) {
                        d[i].name = "current";    
                    } 
                } 
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
    
    serial2Id(serial) {
        var baseSn = Math.floor(serial/1000)*1000;
        return serial-baseSn;
    }


    // Public mandatory methods 
    async setDim(serial,value) {
        var byte = Math.round(value/100*255);
        if(value > 255) value = 255;
        if(value < 0) value=0;
        this.log.debug(`Telldus: set dimmer to ${byte}`);
        await this.api.dimDevice(this.serial2Id(serial),byte).catch((e)=>{ });
    }

    async setOnOff(serial, value) {
        var on = false;
        if(value===1) on = true;
        await this.api.onOffDevice(this.serial2Id(serial),on).catch((e)=>{ });
    }
}

module.exports = new IORiverTelldus(); 
