import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";


const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};


task("balance", "Prints an account's balance")
  .addOptionalParam("account", "The account's address", "")
  .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const accs = await ethers.getSigners();
    const account = taskArgs.account || accs[0].address;
    const balance = await ethers.provider.getBalance(account);

    console.log(ethers.utils.formatEther(balance), "ETH");
  });

task("err", "Prints an account's balance")
  .addOptionalParam("data", "", "")
  .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const fac = await ethers.getContractFactory("ERC20Paymaster");
    const result = fac.interface.parseError(taskArgs.data);

    console.log("result", result);
  });

task("fund-gas", "give them some token that can be spent as gas")
  .addOptionalParam("account", "The account's address or index", "1")
  .addOptionalParam("amount", "The amount in ethers", "1")
  .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const { deployments, ethers } = hre;
    const accs = await ethers.getSigners();
    const [fundSrc, _] = accs;
    const receiverAddress = (taskArgs.account.length == 42) ? taskArgs.account : await accs[taskArgs.account].getAddress();
    const gasTokenDeployment = await deployments.get("GasToken");
    const fac = await ethers.getContractFactory("GasToken");
    const gasToken = fac.attach(gasTokenDeployment.address).connect(fundSrc);
    const res = await gasToken.transfer(receiverAddress, ethers.utils.parseEther(taskArgs.amount));
    await res.wait();

    const balanceAfter = await gasToken.balanceOf(receiverAddress);
    console.log(receiverAddress, "final balance", ethers.utils.formatEther(balanceAfter), "ethers");
  });

  task("log-balances", "show eth & gas token balances of the account")
  .addOptionalParam("account", "The account's address or index", "1")
  .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const { deployments, ethers } = hre;
    const accs = await ethers.getSigners();
    const receiverAddress = (taskArgs.account.length == 42) ? taskArgs.account : await accs[taskArgs.account].getAddress();
    const gasTokenDeployment = await deployments.get("GasToken");
    const fac = await ethers.getContractFactory("GasToken");
    const gasToken = fac.attach(gasTokenDeployment.address);
    const ethBalance = await ethers.provider.getBalance(receiverAddress);
    const tokenBalance = await gasToken.balanceOf(receiverAddress);
    console.log(receiverAddress, "eth balance", ethers.utils.formatEther(ethBalance), "ethers");
    console.log(receiverAddress, "token balance", ethers.utils.formatEther(tokenBalance), "ethers");
  });

  task("get-owner", "")
  .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const { deployments, ethers } = hre;
    const d = await deployments.get("ERC20Paymaster");
    const fac = await ethers.getContractFactory("ERC20Paymaster");
    const gasToken = fac.attach(d.address);
    const res = await gasToken.owner();

    console.log("paymaster owner", res);
  });

  task("get-sender-creator", "")
  .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const { deployments, ethers } = hre;
    const d = await deployments.get("EntryPoint");
    const fac = await ethers.getContractFactory("EntryPoint");
    const c = fac.attach(d.address);
    const res = await c.senderCreator();

    console.log("senderCreator", res);
  });
