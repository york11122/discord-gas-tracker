require('dotenv').config();
const { Client, MessageActionRow, MessageSelectMenu, MessageEmbed } = require('discord.js');
const axios = require('axios');
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
const trackUser = require('./jobs/trackUser')
const MongoClient = require("mongodb").MongoClient;
const randomip = require('random-ip');
const Mongoclient = new MongoClient(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

let db = null;
let mongo = null;

client.once('ready', async () => {
    mongo = await Mongoclient.connect();
    db = mongo.db("discord-bot");
    getGas();
    doTrack();
});

let gasPrices = {};

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

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

getFloorPrice = async (contract_address) => {
    try {
        const url = `https://api.nftport.xyz/v0/transactions/stats/${contract_address}?chain=ethereum`;
        const response = await axios.get(url, {
            headers: {
                "Authorization": process.env.NFTPORT_KEY,
            }
        });
        await sleep(400);
        return response.data.statistics.floor_price ? response.data.statistics.floor_price : -1;
    } catch (err) {
        console.log(contract_address)
        return -1;
    }
}

doTrack = async () => {
    try {
        const trackingList = await db.collection("nft-tracking-list").find({}).toArray()

        if (trackingList) {
            for (let trackRecord of trackingList) {
                const trackData = await trackUser.track(trackRecord, db);
                for (let track of trackData) {

                    const exampleEmbed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle(`${track.type.toUpperCase()}`)
                        .setURL(track.nft)
                        .setAuthor({ name: track.userAddress.slice(-5) })
                        .addFields(
                            { name: 'Price', value: `${track.price_details.price}/${track.price_details.asset_type}` },
                        )
                        .setTimestamp(Date.parse(track.transaction_date))

                    if (track.img_url && track.img_url.startsWith("https://")) {
                        exampleEmbed.setThumbnail(track.img_url)
                    }
                    if (track.type === "sell") {

                        exampleEmbed.addField('Profit', `${track.profit}/${track.price_details.asset_type}`, true)
                        exampleEmbed.addField('Buying Price', `${track.buy_price_details.price}/${track.price_details.asset_type}`, true)
                        exampleEmbed.addField('Selling Price', `${track.price_details.price}/${track.price_details.asset_type}`, true)
                    }

                    const channel = client.channels.cache.get(trackRecord.channel);
                    channel.send({ embeds: [exampleEmbed] });
                }
            }
        }
    } catch (err) {
        console.log(err.message)
    }
}

checkAlerts = async () => {

    const alerts = await db.collection("gas-tracking-list").find({}).toArray();

    for (let alert of alerts) {
        if (alert.nextExecutionTime === null || alert.nextExecutionTime < Date.now()) {
            if (alert.lowerThan >= gasPrices.FastGasPrice) {
                alert.nextExecutionTime = addTime(new Date(), parseInt(process.env.ALERT_INTERVAL_MIN));

                await db.collection("gas-tracking-list").updateOne(
                    { toUser: alert.toUser },
                    { $set: alert }
                )
                const channel = client.channels.cache.get(alert.channel);
                channel.send(`<@${alert.toUser}> Gas fee 目前為 ${gasPrices.FastGasPrice} gwei，低於您設定的 ${alert.lowerThan} gwei，請把握時機。`);
            }
        }
    }

}

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isCommand() && interaction.commandName === 'alert') {
            const lowerThan = interaction.options.getInteger('gwei');

            await interaction.deferReply();

            await db.collection("gas-tracking-list").updateOne(
                { toUser: interaction.user.id },
                { $set: { toUser: interaction.user.id, channel: interaction.channel.id, nextExecutionTime: null, lowerThan } },
                { upsert: true }
            )

            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('設定通知')
                .setDescription(`當Gas fee低於 ${lowerThan} 通知 ${interaction.user.username}`);
            interaction.editReply({ embeds: [embed] });
        }

        if (interaction.isCommand() && interaction.commandName === 'cancel_alert') {
            await interaction.deferReply();
            await db.collection("gas-tracking-list").deleteOne({ toUser: interaction.user.id });

            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('設定通知')
                .setDescription(`取消通知 ${interaction.user.username}`);
            interaction.editReply({ embeds: [embed] });
        }

        if (interaction.isCommand() && interaction.commandName === 'track') {
            const userAddress = interaction.options.getString('address');
            await interaction.deferReply();

            const trackUser = await db.collection("nft-tracking-list").findOne(
                { userAddress }
            )
            if (!trackUser) {
                await db.collection("nft-tracking-list").insertOne(
                    { channel: interaction.channel.id, userAddress, lastTranHash: null }
                )
            }
            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('設定通知')
                .setDescription(`設定追蹤用戶: ${userAddress}`);
            interaction.editReply({ embeds: [embed] });
        }

        if (interaction.isCommand() && interaction.commandName === 'get_nfts') {
            const userAddress = interaction.options.getString('address');
            await interaction.deferReply();
            const nfts = await db.collection("tracking-user-nft-owned").find({
                userAddress: { $regex: new RegExp(userAddress, "i") },
            }).toArray();

            let nftsString = '';
            let i = 0;
            for (let nft of nfts) {
                if (i > 15) break;
                i++;
                nftsString = nftsString + "\n" + `${nft.nft} ${nft.isSold ? `(已賣出 roi:${nft.roi}, isWin:${nft.isWin})` : "(未賣出)"}`
            }

            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`${userAddress}`)
                .setDescription(`${nftsString}`);
            interaction.editReply({ embeds: [embed] });
        }


        if (interaction.isCommand() && interaction.commandName === 'win_rate') {
            const userAddress = interaction.options.getString('address');
            await interaction.deferReply();
            const nfts = await db.collection("tracking-user-nft-owned").find({
                userAddress: { $regex: new RegExp(userAddress, "i") },
            }).toArray();

            let winTimes = 0;
            let sold_total = 0;
            let unsold_winTimes = 0;
            let unsold_total = 0;
            let tempFloorPrice = new Map();
            for (let nft of nfts) {
                if (nft.isSold) {
                    if (nft.isWin) {
                        winTimes = winTimes + 1;
                    }
                    sold_total = sold_total + 1;
                }
                else {
                    let floor_price = tempFloorPrice.get(nft.contract_address);
                    if (!floor_price) {
                        floor_price = await getFloorPrice(nft.contract_address);
                        tempFloorPrice.set(nft.contract_address, floor_price);
                    }
                    if (floor_price >= 0) {
                        if ((nft.price_details.price - floor_price) > 0) {
                            unsold_winTimes = unsold_winTimes + 1;
                        }
                        unsold_total = unsold_total + 1;
                    }
                }
            }

            const winRate = winTimes / sold_total;
            const unsold_winRate = unsold_winTimes / unsold_total;

            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`${userAddress}`)
                .setDescription(`win rate: ${winRate} | unsold win rate: ${unsold_winRate} `);
            interaction.editReply({ embeds: [embed] });
        }


        if (interaction.isCommand() && interaction.commandName === 'cancel_track') {
            const userAddress = interaction.options.getString('address');
            await interaction.deferReply();
            await db.collection("nft-tracking-list").deleteOne({ userAddress });

            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('設定通知')
                .setDescription(`取消追蹤用戶: ${userAddress}`);
            interaction.editReply({ embeds: [embed] });
        }



        if (interaction.isCommand() && interaction.commandName === 'list_track') {
            await interaction.deferReply();
            const trackList = await db.collection("nft-tracking-list").find({ channel: interaction.channel.id }).toArray();
            let trackListString = '';
            for (let track of trackList) {
                trackListString = trackListString + "\n" + track.userAddress;
            }

            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('目前追蹤用戶')
                .setDescription(` ${trackListString}`);
            interaction.editReply({ embeds: [embed] });
        }
    } catch (err) {
        console.log(err.message);
    }

});

setInterval(getGas, 5 * 1000);
setInterval(doTrack, 5 * 60 * 1000);
client.login(process.env.DISCORD_TOKEN);

