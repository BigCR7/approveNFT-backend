import express from "express";
import bodyParser from "body-parser";
import cors from 'cors';
import fetch from "node-fetch";

const router = express.Router();

var app = express();
app.use("/", router);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

app.post('/nfts', (req, res) => {
    const account = req.body.account;
    get_opensea_data(account).then((result) => res.send({ nftInfo: result }))
})

var server = app.listen(8000, function () {
    var port = server.address().port;
    console.log('App listening at %s', port);
});

async function get_opensea_data(address) {
    const baseURL = "https://eth-mainnet.g.alchemy.com/v2/FCWZFXUmrFtpAlUGlzQsOBdJfQaZZCzt"; // for mainnet
    // const baseURL = "https://eth-rinkeby.alchemyapi.io/v2/ohNNPm68LXUZDHC_MPNS9f_LCXBPcI5F"; // for rinkeby
    const url = `${baseURL}/getNFTs/?owner=${address}`;
    var requestOptions = {
        method: 'get',
        redirect: 'follow'
    };
    const response1 = await fetch(url, requestOptions)
    const tokenIdInfo = (await response1.json()).ownedNfts
 
    const response2 = await fetch(`https://api.opensea.io/api/v1/collections?offset=0&asset_owner=${address}`)
    const json = await response2.json()

    var tokens_grouped_by_token_address_and_price;
    var tokens_grouped_by_token_address = [];

    json?.reduce((acc, nft) => {
        if (nft.primary_asset_contracts.length ===  0){
            tokens_grouped_by_token_address_and_price = acc;
            return acc
        }
        if (!acc[nft.primary_asset_contracts[0].address.toLowerCase()]) {
            acc[nft.primary_asset_contracts[0].address.toLowerCase()] = []
        }
        const tokenAddress = nft.primary_asset_contracts[0].address.toLowerCase();
        acc[tokenAddress] = {"price": nft.stats.seven_day_average_price, "schema": nft.primary_asset_contracts[0].schema_name}

        const result = tokenIdInfo.filter((item) => item.contract.address === tokenAddress)
        let tokenIds = [];
        result.map((item) => tokenIds.push(parseInt(item.id.tokenId)))
        tokens_grouped_by_token_address[tokenAddress] = tokenIds
        tokens_grouped_by_token_address_and_price = acc;
        return acc
    }, {})

    let nfts = [];

    for (let token_address in tokens_grouped_by_token_address_and_price) {
        nfts.push({
            token_address: token_address,
            token_ids: tokens_grouped_by_token_address[token_address],
            price: tokens_grouped_by_token_address_and_price[token_address].price,
            schema : tokens_grouped_by_token_address_and_price[token_address].schema
        })
    }

    nfts.sort((a, b) => {
        return b.price - a.price
    })

    return nfts;
}