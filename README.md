
ioriver-telldus
===============

A Ioriver plugin to bridge Telldus Local API with IMSE Ultra BAC/BMS/PLC

## Configuration
configure platform in platform section of the ioriver config.json file.

```json
{
  
 "platforms":[
        {
           "platform":"ioriver-telldus",
            "name":"My Telldus",
            "ip": "10.0.48.95",
            "sn_x1000":1,
            "access_token":"MY_LOCAL_ACCESS_TOKEN",
            "ignore_id_list": [1,2,3]
        }
    ]
}
```

## Setup
See https://github.com/mifi/telldus-local-auth on how to obtain a security token for your local api