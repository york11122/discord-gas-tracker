const axios = require('axios');
require('dotenv').config();
const _ = require("lodash");

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}


getAccountTransfer = async (accountAddress, limit, direction, cursor) => {
    try {
        let url = `https://deep-index.moralis.io/api/v2/${accountAddress}/nft/transfers?chain=eth&format=decimal&limit=${limit}&direction=${direction}`;
        if (cursor) {
            url = url + `&cursor=${cursor}`
        }
        const res = await axios.get(url, {
            headers: {
                "X-API-Key": "vKi6zzRfweVu3mmBZtbQLzGoVGH8QTt2ay2c7s3eYa2nFxDqVcHJSK2TjagFAiDX",
            }
        })

        return res.data
    }
    catch (err) {
        console.log(err.message, 123)
    }
}

getNftTrade = async (token_address, block_number, transaction_hash) => {
    let data;
    await sleep(200);
    try {
        const res = await axios.get(`https://deep-index.moralis.io/api/v2/nft/${token_address}/trades?chain=eth&format=decimal&from_block=${block_number}`, {
            headers: {
                "X-API-Key": "vKi6zzRfweVu3mmBZtbQLzGoVGH8QTt2ay2c7s3eYa2nFxDqVcHJSK2TjagFAiDX",
            }
        })

        data = res.data;
        const detail = _.find(data.result, { transaction_hash })
        return detail ? detail : null
    }
    catch (err) {
        console.log(err.message, data, token_address)
    }
}

const trackUser = async (trackRecord, direction, limit, db, cursor) => {

    let min_time_block;

    if (direction === "from") {
        const res = await db.collection("tracking-user-nft-owned").aggregate(
            [
                {
                    $group:
                    {
                        _id: "$userAddress",
                        min: { $min: "$buy_block_number" }
                    }
                },
                { $match: { _id: trackRecord.userAddress } }
            ]
        ).toArray()
        min_time_block = res[0].min
    }

    const data = await getAccountTransfer(trackRecord.userAddress, limit, direction, cursor);
    const resultData = data.result;

    if (resultData.length === 0) {
        return [];
    }
    const lastTranHash = resultData[0].transaction_hash
    const returnCursor = data.cursor
    let listToNodify = [];
    if (trackRecord.lastTranHash) {
        for (let item of resultData) {
            //stop tracking selling data when selling data is older than buying data
            if (direction === "from") {
                if (item.block_number <= min_time_block) {
                    break;
                }
            }
            //no new record
            if (item.transaction_hash === trackRecord.lastTranHash) {
                break;
            }

            // pass mint
            if (item.from_address === '0x0000000000000000000000000000000000000000' || item.value === '0') {
                console.log('mint')
                continue;
            }

            // buy
            if (item.to_address.toLowerCase() === trackRecord.userAddress.toLowerCase()) {
                const detail = await getNftTrade(item.token_address, item.block_number, item.transaction_hash)
                if (!detail) {
                    console.log('no detail')
                    continue;
                }

                const nft = {
                    userAddress: trackRecord.userAddress,
                    nft_url: `https://opensea.io/assets/${item.token_address}/${item.token_id}`,
                    contract_type: item.contract_type,
                    transaction_hash: item.transaction_hash,
                    buy_block_number: item.block_number,
                    buy_timestamp: item.block_timestamp,
                    block_hash: item.block_hash,
                    from_address: item.from_address,
                    to_address: item.to_address,
                    token_address: item.token_address,
                    token_id: item.token_id,
                    price: detail.price / 1000000000000000000,
                    isSold: false,
                    isWin: false,
                    isTran: detail.token_ids.length > 1,
                    sellingPrice: 0,
                    sell_timestamp: null,
                    sell_block_number: null

                }
                await db.collection("tracking-user-nft-owned").insertOne(nft)
                listToNodify.push({
                    userAddress: trackRecord.userAddress,
                    type: 'buy',
                    price: nft.price,
                    transaction_date: nft.buy_timestamp,
                    nft: nft.nft_url
                })
            }
            // sell
            else {
                // find nft not sold
                const nft = await db.collection("tracking-user-nft-owned").findOne({
                    userAddress: trackRecord.userAddress,
                    token_address: item.token_address,
                    token_id: item.token_id,
                    isSold: false
                })
                // if exist then caculate roi
                if (nft) {
                    const detail = await getNftTrade(item.token_address, item.block_number, item.transaction_hash)
                    if (detail) {
                        const sellPrice = detail.price / 1000000000000000000;
                        const profit = ((sellPrice * 0.875) - nft.price).toFixed(4);
                        const roi = profit / nft.price

                        await db.collection("tracking-user-nft-owned").updateOne({
                            userAddress: trackRecord.userAddress,
                            token_address: item.token_address,
                            token_id: item.token_id,
                        }, { $set: { isSold: true, isWin: profit > 0 ? true : false, roi, sellingPrice: sellPrice, sell_timestamp: detail.block_timestamp, sell_block_number: detail.block_number } })

                        listToNodify.push({
                            userAddress: trackRecord.userAddress,
                            type: 'sell',
                            price: nft.price,
                            sellPrice,
                            transaction_date: nft.buy_timestamp,
                            sell_date: detail.block_timestamp,
                            nft: nft.nft_url,
                            profit,
                            roi
                        })
                    }
                    else {
                        await db.collection("tracking-user-nft-owned").deleteOne({
                            userAddress: trackRecord.userAddress,
                            token_address: item.token_address,
                            token_id: item.token_id,
                        })

                    }
                }
                else {
                    console.log('not found.')
                }
            }
        }
    }

    if (!cursor) {
        await db.collection("nft-tracking-list").updateOne(
            { userAddress: trackRecord.userAddress },
            { $set: { lastTranHash: lastTranHash } }
        )
    }
    return [returnCursor, listToNodify]
}

const getFloorPrice = async (contract_address) => {
    try {
        const url = `https://deep-index.moralis.io/api/v2/nft/${contract_address}/lowestprice`;
        const response = await axios.get(url, {
            headers: {
                "X-API-Key": "vKi6zzRfweVu3mmBZtbQLzGoVGH8QTt2ay2c7s3eYa2nFxDqVcHJSK2TjagFAiDX",
            }
        });
        await sleep(200);
        return response.data.price ? response.data.price / 1000000000000000000 : -1;
    } catch (err) {
        console.log(contract_address)
        return -1;
    }
}



module.exports = { trackUser, getFloorPrice }






    // const promise = [];
    // for (let i = 0; i < resultData.length; i++) {
    //     if (resultData[i].from_address === '0x0000000000000000000000000000000000000000' || resultData[i].value === '0')
    //         continue;
    //     const result = await getNftTrade(resultData[i].token_address, resultData[i].block_number)
    //     if (resultData[i].to_address === userAddress) {
    //         console.log(result, 'buy', resultData[i].value)
    //     }
    //     else
    //         console.log(result, 'sell', resultData[i].value)
    // }

