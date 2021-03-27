const os = require('os');

let t = setInterval(()=> {
    console.log(`${(new Date()).toISOString()}\t Hello! I am ${os.hostname()}`);
}, 5000);

// clearInterval(t);