require('dotenv').config();

const { Client, MessageActionRow, MessageSelectMenu, MessageEmbed } = require('discord.js');
const axios = require('axios');
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
const redis = require('redis');
const cache = redis.createClient({ url: process.env.REDIS_URL || REDIS_URL }); // this creates a new client


client.once('ready', async () => {
    // await cache.connect();
    getGas();
    //await cache.set("test", new Map().toe)
    //console.log(await cache.get("test"))
});

let gasPrices = {};
let alerts = new Map();

addTime = (time, minutes) => {
    return time.setMinutes(time.getMinutes() + minutes);
}

getGas = () => {
    let req = `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETH_GAS_KEY}`;
    axios.get(req).then(res => {
        gasPrices = res.data.result;
        client.user.setActivity(`⚡️${gasPrices.FastGasPrice} |🚶‍♀️${gasPrices.ProposeGasPrice} |🐢${gasPrices.SafeGasPrice}`, { type: 'WATCHING' });
        checkAlerts();
    }).catch(err => {
        console.log(err.message);
    })
}

checkAlerts = () => {

    alerts.forEach((alertInfo, key) => {
        if (alertInfo.nextExecutionTime === null || alertInfo.nextExecutionTime < Date.now()) {
            if (alertInfo.lowerThan >= gasPrices.FastGasPrice) {
                alertInfo.nextExecutionTime = addTime(new Date(), parseInt(process.env.ALERT_INTERVAL_MIN));
                alertInfo.channel.send(`<@${alertInfo.toUser.id}> Gas fee 目前為 ${gasPrices.FastGasPrice} gwei，低於您設定的 ${alertInfo.lowerThan} gwei，請把握時機。`);
            }
        }
    })
}

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isCommand() && interaction.commandName === 'alert') {
            const lowerThan = interaction.options.getInteger('gwei');
            let alertInfo = { channel: interaction.channel, toUser: interaction.user, nextExecutionTime: null, lowerThan };

            await interaction.deferReply();

            if (!alerts.has(interaction.user.id)) {
                alerts.set(interaction.user.id, alertInfo);
            } else {
                alerts.set(interaction.user.id, alertInfo);
            }

            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('設定通知')
                .setDescription(`當Gas fee低於 ${lowerThan} 通知 ${interaction.user.username}`);
            interaction.editReply({ embeds: [embed] });
        }

        if (interaction.isCommand() && interaction.commandName === 'cancel') {
            await interaction.deferReply();
            alerts.delete(interaction.user.id);

            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('設定通知')
                .setDescription(`取消通知 ${interaction.user.username}`);
            interaction.editReply({ embeds: [embed] });
        }
    } catch (err) {
        console.log(err.message);
    }

});

setInterval(getGas, 5 * 1000);
client.login(process.env.DISCORD_TOKEN);
