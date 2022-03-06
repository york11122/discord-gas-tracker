require('dotenv').config();
const { Client, MessageActionRow, MessageSelectMenu, MessageEmbed } = require('discord.js');
const axios = require('axios');
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
const track = require('./a')
const MongoClient = require("mongodb").MongoClient;

const Mongoclient = new MongoClient(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const _ = require("lodash");

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
                const [cursor, trackData] = await track.trackUser(trackRecord, "both", 100, db, null);
                for (let track of trackData) {

                    const exampleEmbed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle(`${track.type.toUpperCase()}`)
                        .setURL(track.nft)
                        .setAuthor({ name: track.userAddress.slice(-5) })
                        .addFields(
                            { name: 'Price', value: `${track.price}` },
                        )
                        .setTimestamp(Date.parse(track.transaction_date))


                    if (track.type === "sell") {

                        exampleEmbed.addField('Profit', `${track.profit.toFixed(2)}`, true)
                        exampleEmbed.addField('Buying Price', `${track.price.toFixed(2)}`, true)
                        exampleEmbed.addField('Selling Price', `${track.sellPrice.toFixed(2)}`, true)
                    }

                    const channel = client.channels.cache.get(trackRecord.channel);
                    channel.send({ embeds: [exampleEmbed] });
                }
            }
        }
    } catch (err) {
        console.log(err.message, track)
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
            // await interaction.deferReply();
            const nfts = await db.collection("tracking-user-nft-owned").find({
                userAddress: { $regex: new RegExp(userAddress, "i") },
                isSold: true,
            }).toArray();
            let nftsString = '';
            let overall_count = 0;
            let overall_sum = 0;

            const orderNfts = _.orderBy(nfts, ['sell_block_number'], ['desc']);
            for (let [i, nft] of orderNfts.entries()) {
                nftsString = nftsString + "\n" + `[${nft.sell_timestamp.split('T')[0]}](${nft.nft_url} '${nft.nft_url}') ${nft.isSold ? `(已賣出 ${nft.isTran ? "*" : ""})  roi: ${nft.roi.toFixed(2)} ${nft.isWin ? "Win" : ""}` : "(未賣出)"}`
                if ((i + 1) % 5 === 0 || (i + 1) >= nfts.length) {
                    const embed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle(`${userAddress}`)
                        .setDescription(`${nftsString}`);
                    interaction.channel.send({ embeds: [embed] });
                    nftsString = '';
                }


                if (nft.isSold) {
                    overall_count = overall_count + 1;
                    overall_sum = overall_sum + nft.roi
                }
            }
            const overall_winrate = overall_sum / overall_count;
            interaction.reply("Overall Roi " + overall_winrate.toFixed(2))
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
            let unsold_real_total = 0;
            let tempFloorPrice = new Map();

            let overall_count = 0;
            let overall_sum = 0;

            for (let nft of nfts) {
                if (nft.isSold) {
                    overall_count = overall_count + 1;
                    overall_sum = overall_sum + nft.roi
                }
                if (nft.isSold) {
                    if (nft.isWin) {
                        winTimes = winTimes + 1;
                    }
                    sold_total = sold_total + 1;
                }
                else {
                    let floor_price = tempFloorPrice.get(nft.token_address);
                    if (floor_price == null) {
                        floor_price = await track.getFloorPrice(nft.token_address);
                        tempFloorPrice.set(nft.token_address, floor_price);
                    }
                    if (floor_price >= 0) {
                        if ((nft.price - floor_price) < 0) {
                            unsold_winTimes = unsold_winTimes + 1;
                        }
                        unsold_total = unsold_total + 1;
                    }
                    unsold_real_total = unsold_real_total + 1;
                }
            }

            const orders = _.orderBy(nfts, ['sell_timestamp'], ['desc'])
            const latestBuy = _.find(orders, { isSold: false })
            const latestSell = _.find(orders, { isSold: true })
            const winRate = winTimes / sold_total;
            const unsold_winRate = unsold_winTimes / unsold_total;
            const overall_roi = overall_sum / overall_count;

            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`${userAddress}`)
                .addFields(
                    { name: 'Nfts', value: `Sold:${sold_total} (${(sold_total / nfts.length).toFixed(2)}) / Unsold:${unsold_real_total} (${(unsold_real_total / nfts.length).toFixed(2)}) / Total:${nfts.length}` },
                    { name: 'Latest sell', value: `${latestSell ? `[${latestSell.sell_timestamp}](${latestSell.nft_url} '${latestSell.nft_url}')` : "NAN"}` },
                    { name: 'Latest buy', value: `${latestBuy ? `[${latestBuy.buy_timestamp}](${latestBuy.nft_url} '${latestBuy.nft_url}')` : "NAN"}` },
                    { name: 'WinRate', value: `${winRate.toFixed(2)}` },
                    { name: 'UnsoldWinRate', value: `${unsold_winRate.toFixed(2)}` },
                    { name: 'Overall roi', value: `${overall_roi.toFixed(2)}` },
                )
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
            let temp = []
            for (let track of trackList) {
                let winTimes = 0;
                let sold_total = 0;

                const nfts = await db.collection("tracking-user-nft-owned").find({
                    userAddress: { $regex: new RegExp(track.userAddress, "i") },
                }).toArray();
                for (let nft of nfts) {
                    if (nft.isSold) {
                        if (nft.isWin) {
                            winTimes = winTimes + 1;
                        }
                        sold_total = sold_total + 1;
                    }
                }
                const winRate = sold_total > 0 ? winTimes / sold_total : 0;

                temp.push({ userAddress: track.userAddress, winRate })

            }
            const ordered = _.orderBy(temp, ['winRate'], ['desc'])

            for (let i of ordered) {
                trackListString = trackListString + "\n" + i.winRate.toFixed(2) + " / " + i.userAddress;
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

