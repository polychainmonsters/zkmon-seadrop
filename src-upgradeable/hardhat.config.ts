import "@typechain/hardhat";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-ethers";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-chai-matchers";
require('dotenv').config({
  path: `${__dirname}/../.env`
});

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    ...(process.env.RPC_URL_GOERLI ? {
      goerli: {
        url: process.env.RPC_URL_GOERLI,
        accounts: [process.env.PRIVATE_KEY],
      }
    } : {}),
    ...(process.env.RPC_URL_SEPOLIA ? {
      sepolia: {
        url: process.env.RPC_URL_SEPOLIA,
        accounts: [process.env.PRIVATE_KEY],
      }
    } : {})
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_KEY,
  },
  paths: { sources: "./src" },
};
