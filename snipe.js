"use strict";
const ethers = require("ethers");
const retry = require("async-retry");
const pcsAbi = new ethers.utils.Interface(require("./abi.json"));
const env = require("dotenv");
const result = env.config()
const { approveToken } = require('./approve');
const ora = require('ora');

if (result.error) {
    throw result.error
}

let provider;
let wallet;
let account;
let router;
let spinner;

const buyToken = async (token, purchaseAmount) => {
    provider = new ethers.providers.WebSocketProvider(process.env.BSC_NODE_WSS);
    wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    account = wallet.connect(provider);
    router = new ethers.Contract(tokens.router, pcsAbi, account);
    const parsedPurchaseAmount = ethers.utils.parseUnits(purchaseAmount, "ether");
    const buyPair = {
        pair: [
            "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
            token.toString()
        ]
    }
    const tx = await retry(
        async () => {
            spinner = ora(`Buying ${token}`).start();
            const amountOutMin = 0;
            let buyConfirmation = await router.swapExactETHForTokens(
                amountOutMin,
                buyPair.pair,
                process.env.RECIPIENT,
                Date.now() + 1000 * tokens.deadline,
                {
                    value: parsedPurchaseAmount,
                    gasLimit: tokens.GASLIMIT,
                    gasPrice: ethers.utils.parseUnits(tokens.GASPRICE, "gwei"),
                }
            );
            return buyConfirmation;
        },
        {
            retries: tokens.buyRetries,
            minTimeout: tokens.retryMinTimeout,
            maxTimeout: tokens.retryMaxTimeout,
            onRetry: (err, number) => {
                spinner.warn("Buy Failed - Retrying", number);
                console.log("Error", err.reason);
                if (number === tokens.buyRetries) {
                    spinner.fail("Sniping has failed...");
                    console.log("")
                }
            },
        }
    );
    spinner.succeed(`Bought ${token}!`);
    console.log("  Transaction receipt: https://www.bscscan.com/tx/" + tx.hash);
    console.log("  Poocoin chart: https://poocoin.app/tokens/" + token);

    console.log("")
    await approveToken(token);
};

module.exports = {
    buyToken,
};