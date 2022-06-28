# Installation:

```bash
cd ./funko
npm install
```

# Requirements

Emails should be in ```./funko/src/email.txt```

Proxies should be in ```./funko/src/proxy.txt```

Email format: ```email:password:imap_address:port```

Proxy format: ```login:password@ip:port```


# Launch autoreg:

```bash
node ./src/index.js
```

# Anticaptcha api-key

Anticaptcha key is needed to get in queue, **it's not needed for registration**.

In ```./funko/src/anticaptcha/js/config_ac_api_key.js```

In line 
```js
var antiCapthaPredefinedApiKey = '';
```

Set your anticaptcha-apikey like this:

```js
var antiCapthaPredefinedApiKey = 'nuptnu3223_32un2u3tn3t';
```
