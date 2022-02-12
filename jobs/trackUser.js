const axios = require('axios');
require('dotenv').config();
const _ = require("lodash");


track = async (trackRecord, db) => {
    try {

        const [res, opensea_res] = await Promise.all([
            axios.get(`https://api.nftport.xyz/v0/transactions/accounts/${trackRecord.userAddress}?chain=ethereum&type=sell&page_size=50&type=buy&type=list`, {
                headers: {
                    "Authorization": process.env.NFTPORT_KEY
                }
            }), axios.get(`https://api.opensea.io/api/v1/collections?offset=0&limit=300&asset_owner=${trackRecord.userAddress}`, {
                headers: {
                    "Accept": "application/json"
                }
            })])


        const trackData = res.data.transactions;
        if (trackData.length === 0) {
            return [];
        }
        const lastTranHash = trackData[0].transaction_hash;
        let listToNodify = [];
        if (trackRecord.lastTranHash) {
            for (let item of trackData) {
                const result = _.filter(opensea_res.data, (r) => {
                    let obj = _.find(r.primary_asset_contracts, { address: item.nft.contract_address });
                    if (obj) { return obj }
                })

                const slug = result[0].slug;
                const img_url = result[0].image_url;

                if (item.transaction_hash === trackRecord.lastTranHash) {
                    break;
                }
                if (item.type === 'cancel_list') {
                    continue;
                }
                if (item.type === 'sale') {
                    if (item.seller_address === trackRecord.userAddress) {
                        const nft = await db.collection("tracking-user-nft-owned").findOne({
                            userAddress: trackRecord.userAddress,
                            contract_address: item.nft.contract_address,
                            token_id: item.nft.token_id,
                            isSold: false
                        })

                        const profit = (item.price_details.price - nft.price_details.price).toFixed(4);
                        const roi = profit * 0.875 / nft.price_details.price

                        if (nft) {
                            listToNodify.push({
                                userAddress: trackRecord.userAddress,
                                type: 'sell',
                                price_details: item.price_details,
                                transaction_date: item.transaction_date,
                                buy_price_details: nft.price_details,
                                profit,
                                roi,
                                slug,
                                img_url,
                                nft: `https://opensea.io/assets/${item.nft.contract_address}/${item.nft.token_id}`
                            })

                            await db.collection("tracking-user-nft-owned").updateOne({
                                userAddress: trackRecord.userAddress,
                                contract_address: item.nft.contract_address,
                                token_id: item.nft.token_id
                            }, { $set: { isSold: true, isWin: profit > 0 ? true : false, roi } }
                            )
                        }
                        else {
                            listToNodify.push({
                                userAddress: trackRecord.userAddress,
                                type: 'sell',
                                price_details: item.price_details,
                                transaction_date: item.transaction_date,
                                buy_price_details: "NA",
                                profit: "NA",
                                slug,
                                img_url,
                                nft: `https://opensea.io/assets/${item.nft.contract_address}/${item.nft.token_id}`
                            })
                        }
                    }
                    else {
                        listToNodify.push({
                            userAddress: trackRecord.userAddress,
                            type: 'buy',
                            slug,
                            img_url,
                            transaction_date: item.transaction_date,
                            price_details: item.price_details,
                            nft: `https://opensea.io/assets/${item.nft.contract_address}/${item.nft.token_id}`
                        })

                        await db.collection("tracking-user-nft-owned").insertOne({
                            userAddress: trackRecord.userAddress,
                            buyFrom: item.seller_address,
                            price_details: item.price_details,
                            transaction_date: item.transaction_date,
                            marketplace: item.marketplace,
                            contract_address: item.nft.contract_address,
                            token_id: item.nft.token_id,
                            contract_type: item.nft.contract_type,
                            slug,
                            img_url,
                            nft: `https://opensea.io/assets/${item.nft.contract_address}/${item.nft.token_id}`
                        })
                    }
                }
                else {
                    listToNodify.push({
                        userAddress: trackRecord.userAddress,
                        type: item.type,
                        price_details: item.price_details,
                        transaction_date: item.transaction_date,
                        slug,
                        img_url,
                        nft: `https://opensea.io/assets/${item.nft.contract_address}/${item.nft.token_id}`
                    })
                }
            }

        }

        await db.collection("nft-tracking-list").updateOne(
            { userAddress: trackRecord.userAddress },
            { $set: { lastTranHash: lastTranHash } }
        )
        return listToNodify


    } catch (err) {
        console.log(err.message)
    }

}

trackUser = async (userAddress) => {
    try {
        let req = `https://api.nftport.xyz/v0/transactions/accounts/${userAddress}?chain=ethereum&type=sell&page_size=50&type=buy`;
        const res = await axios.get(req, {
            headers: {
                "Authorization": process.env.NFTPORT_KEY
            }
        })
        const grouped = _.groupBy(res.data.transactions, item => `"${item.nft.contract_address}/${item.nft.token_id}"`);
        const resultData = _.forEach(grouped, function (value, key) {
            grouped[key] = _.groupBy(grouped[key], function (item) {
                return item.type;
            });
        });

        const resultData2 = _.filter(resultData, function (value, key) {
            if (value.sale && value.sale.length > 1) {
                return value.sale;
            }
        });

        const finalData = _.orderBy(resultData2, ['block_number'], ['desc']);
        let temp = []
        _.forEach(finalData, item => {
            let isRecord = _.some(item.sale, { "transaction_hash": "0x8494cea9a40907aec4755b0c1e82f4d5a21371d15a0eface951c50ea70ed0d8b" })
            if (!isRecord) {
                temp.push({
                    seller: item.sale[1].buyer_address,
                    buyFrom: item.sale[1].seller_address,
                    sellTo: item.sale[0].buyer_address,
                    buyInfo: item.sale[1],
                    sellInfo: item.sale[0],
                    profit: (item.sale[0].price_details.price - item.sale[1].price_details.price).toFixed(2),
                    nft: `https://opensea.io/assets/${item.sale[0].nft.contract_address}/${item.sale[0].nft.token_id}`
                })
            }
        })
        return temp;
    } catch (err) {
        console.log(err.message)
    }

}

module.exports = { track }