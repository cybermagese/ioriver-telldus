ioriver-telldus
===============
A Ioriver plugin to bridge Telldus Local API with IMSE Ultra BAC/BMS/PLC

# Usage
configure platform in the ioriver config.json file.

```json
{
  
 "platforms":[
        {
           "platform":"ioriver-telldus",
            "name":"My Telldus",
            "ip": "10.0.48.95",
            "access_token":"MY_LOCAL_ACCESS_TOKEN",
            "ignore_id_list": [1,2,3],
            "virtual_accessories":[
                {
                    "name":"my ultra switch",
                    "type":"device",
                    "model":"switch"
                }
            ]
        }
    ]
}
```

# Setup
See https://github.com/mifi/telldus-local-auth on how to obtain a security token for your local api