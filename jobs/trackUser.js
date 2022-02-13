const axios = require('axios');
require('dotenv').config();
const _ = require("lodash");
const randomip = require('random-ip');

track = async (trackRecord, db) => {
    try {
        let req = `https://api.nftport.xyz/v0/transactions/accounts/${trackRecord.userAddress}?chain=ethereum&type=sell&page_size=50&type=buy&type=list`;
        const res = await axios.get(req, {
            headers: {
                "Authorization": process.env.NFTPORT_KEY
            }
        })
        const trackData = res.data.transactions;
        if (trackData.length === 0) {
            return [];
        }
        const lastTranHash = trackData[0].transaction_hash ? trackData[0].transaction_hash : trackData[0].transaction_date;

        let listToNodify = [];
        if (trackRecord.lastTranHash) {

            const isNeedRun = lastTranHash !== trackRecord.lastTranHash
            // console.log(trackData)
            for (let item of trackData) {
                if (!isNeedRun) {
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



                        if (nft) {

                            const profit = (item.price_details.price - nft.price_details.price).toFixed(4);
                            const roi = profit * 0.875 / nft.price_details.price

                            listToNodify.push({
                                userAddress: trackRecord.userAddress,
                                type: 'sell',
                                price_details: item.price_details,
                                transaction_date: item.transaction_date,
                                buy_price_details: nft.price_details,
                                profit,
                                roi,
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
                                buy_price_details: { price: "NA" },
                                profit: "NA",
                                nft: `https://opensea.io/assets/${item.nft.contract_address}/${item.nft.token_id}`
                            })
                        }
                    }
                    else {

                        const contractDetail = await getContractDetail(item.nft.contract_address);
                        const slug = contractDetail.collection.slug;
                        const img_url = contractDetail.image_url;
                        listToNodify.push({
                            userAddress: trackRecord.userAddress,
                            type: 'buy',
                            transaction_date: item.transaction_date,
                            price_details: item.price_details,
                            slug,
                            img_url,
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

getContractDetail = async (contract_address) => {
    const ipAddress = randomip("114.45.0.0", 16);

    const res = await axios.get(`https://api.opensea.io/api/v1/asset_contract/${contract_address}`, {
        headers: {
            "Client-IP": ipAddress,
            "REMOTE_ADDR": ipAddress,
            "X-Forwarded-For": ipAddress,
            "Accept": "application/json",
            "referrer": "https://api.opensea.io/api/v1/asset_contract",
            "User-Agent": "'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36';"
        }
    })
    return res.data


}

module.exports = { track, getContractDetail }