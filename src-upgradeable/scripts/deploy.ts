import fs from "fs";
import { ethers, upgrades } from "hardhat";

async function mainDeploy() {
  const ZKMon = await ethers.getContractFactory("zkMon");
  console.log("Deploying...");
  const zkMon = await upgrades.deployProxy(
    ZKMon,
    [
      "zkMon",
      "ZKMON",
      ["0x00005EA00Ac477B1030CE78506496e8C2dE24bf5"],
    ],
    { initializer: "initialize", timeout: 600000 }
  );
  // await zkMon.deployed();
  const addresses = {
    proxy: await zkMon.getAddress(),
    admin: await upgrades.erc1967.getAdminAddress(await zkMon.getAddress()),
    implementation: await upgrades.erc1967.getImplementationAddress(
      await zkMon.getAddress()
    ),
  };
  console.log("Addresses: ", addresses);

  try {
    await (run as any)("verify", { address: addresses.implementation });
  } catch (e) {}

  fs.writeFileSync("deployment-addresses.json", JSON.stringify(addresses));
}

mainDeploy();
