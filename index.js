const Discord = require('discord.js');
const axios = require('axios');
const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
require('dotenv').config();

client.once('ready', () => {
    getGas();
});

let gasPrices = {};
let alerts = new Map()

getGas = () => {
    let req = `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETH_GAS_KEY}`;
    axios.get(req).then(res => {
        gasPrices = res.data.result;
        client.user.setActivity(`⚡️${gasPrices.FastGasPrice} |🚶‍♀️${gasPrices.ProposeGasPrice} |🐢${gasPrices.SafeGasPrice}`, { type: 'WATCHING' });
        checkAlerts();
    })
}

checkAlerts = () => {
    alerts.forEach((amounts, author) => {
        // console.log(amounts);
        amounts.forEach((amount, index) => {
            if (amount >= gasPrices.FastGasPrice) {
                author.send(`Gas price 目前低於 ${gasPrices.FastGasPrice} gwei，請把握時機`);
                let newAlertList = [...alerts.get(author).slice(0, index), ...alerts.get(author).slice(index + 1)];
                alerts.set(author, newAlertList);
            }
        })
    })
}

setInterval(getGas, 5 * 1000);

client.on('messageCreate', message => {
    const prefix = '!alert';
    if (message.content.startsWith(prefix)) {
        let args = message.content.slice(prefix.length + 1).trim().split(' ');
        if (args[0] === '') args = args.splice(0, 0);
        if (args.length === 1) {
            let amount = parseInt(args[0]) || 0;
            if (amount === 0) {
                message.channel.send(`!alert 後方需為數字(欲追蹤 gwei價格)`);
                return;
            }
            let user = message.author;
            let name = message.member.nickname ? message.member.nickname : message.member.user.username;
            message.channel.send(`Gas price 低於 ${amount} gwei時，將私訊通知${name}`);
            if (!alerts.has(user)) {
                alerts.set(user, [amount]);
            } else {
                let newAlertList = alerts.get(user);
                newAlertList.push(amount);
                alerts.set(user, newAlertList);
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
