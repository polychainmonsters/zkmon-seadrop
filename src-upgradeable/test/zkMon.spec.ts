import { Wallet } from "ethers";
import { expect } from "chai";
import fs from "fs";
// @ts-ignore somehow upgrades and ethers are not recognized even though they are available
import { ethers, network, upgrades } from "hardhat";
import { poseidonContract } from "circomlibjs";
import { ERC721PartnerSeaDropUpgradeable, IERC721AUpgradeable, ISeaDropUpgradeable, ZkMon } from "../typechain-types";
import { randomHex } from "../../test/utils/encoding";
import { faucet } from "../../test/utils/faucet";

const toHex = (buffer: Buffer) => {
  return "0x" + buffer.toString("hex");
};

const proofDir = `${__dirname}/../proof_dir`;

async function prove(validatorContract: ZkMon): Promise<boolean> {
  const proofRaw = fs.readFileSync(`${proofDir}/proof`);
  const proofHex = toHex(proofRaw);

  const instanceRaw = fs.readFileSync(`${proofDir}/limbs_instance`);
  const instanceHex = toHex(instanceRaw);

  const merkleRoot = ethers.toBigInt(
    "0x1953ed8741d64c75595aec3373701ac79a4e21f40e211e62052c29bcc45df528",
  );

  await expect(validatorContract.verify(proofHex, instanceHex, merkleRoot))
    .to.emit(validatorContract, "MerkleRootVerified")
    .withArgs(merkleRoot);

  return true;
}

describe("zkMon", function () {
  const { provider } = ethers;
  let seadrop: ISeaDropUpgradeable;
  let zkMon: ZkMon;
  let owner: Wallet;
  let admin: Wallet;
  let minter: Wallet;

  after(async () => {
    await network.provider.request({
      method: "hardhat_reset",
    });
  });

  before(async () => {
    // Set the wallets
    owner = new ethers.Wallet(randomHex(32), provider);
    admin = new ethers.Wallet(randomHex(32), provider);
    minter = new ethers.Wallet(randomHex(32), provider);

    // Add eth to wallets
    for (const wallet of [owner, admin, minter]) {
      await faucet(wallet.address, provider);
    }

    // Deploy SeaDrop
    const SeaDrop = await ethers.getContractFactory("SeaDropMock", owner);
    seadrop = await SeaDrop.deploy();

    // Deploy token
    const zkMonFactory = await ethers.getContractFactory(
      "zkMon",
      owner
    );
    zkMon = await upgrades.deployProxy(zkMonFactory, ["zkMon", "ZKMON", [
      await seadrop.getAddress(),
    ]]);
  });

  it("should verify the zk proof", async () => {
    // deploy the zk related contracts
    const [signer] = await ethers.getSigners();
    const PoseidonFactory = new ethers.ContractFactory(
      poseidonContract.generateABI(2),
      poseidonContract.createCode(2),
      signer,
    );
    const poseidon = await PoseidonFactory.deploy();

    const verifierRaw = fs.readFileSync(
      `${proofDir}/verifier_contract_bytecode`,
    );
    const verifierHex = verifierRaw.reduce(
      (output, elem) => output + ("0" + elem.toString(16)).slice(-2),
      "",
    );

    const verifierFactory = new ethers.ContractFactory([], verifierHex, signer);
    const verifier = await verifierFactory.deploy();

    await zkMon.setZkContracts(await poseidon.getAddress(), await verifier.getAddress());
    const proven = await prove(zkMon);
    expect(proven).to.equal(true);
  });

  it("should allow having a custom token URI contract", async () => {
    // Deploy TokenURIMock
    const TokenURI = await ethers.getContractFactory("TokenURIMock", owner);
    const tokenURI = await TokenURI.deploy();

    await zkMon.setMetadataAddress(await tokenURI.getAddress());

    await zkMon.setMaxSupply(1000);
    await zkMon.updateAllowedSeaDrop([owner.address]);
    await zkMon.mintSeaDrop(owner.address, 1);

    const returnedURI = await zkMon.tokenURI(1);
    expect(returnedURI).to.equal("https://example.com");
  });
});
