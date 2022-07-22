# Installation:

Install node-js, if required: https://nodejs.org/en/

Then do:

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

If you don't want tabs to close after registration is completed (to open up accounts to stay in queue), then in file ```./src/index.js``` change ```true``` to ```false``` in line:

```js
const KEEP_OPEN = true;
```

To run:

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
