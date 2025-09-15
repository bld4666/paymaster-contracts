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
    const fac = await ethers.getContractFactory("SimpleERC20Paymaster");
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
    const d = await deployments.get("SimpleERC20Paymaster");
    const fac = await ethers.getContractFactory("SimpleERC20Paymaster");
    const gasToken = fac.attach(d.address);
    const res = await gasToken.owner();

    console.log("paymaster owner", res);
  });

task("send-gasless-tx", "prepare data and send gasless tx using paymaster")
  .addOptionalParam("account", "The account's address or index", "2")
  .addOptionalParam("amount", "The amount in ethers", "1")
  .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const { deployments, ethers } = hre;
    const accs = await ethers.getSigners();
    const [fundSrc, acc1] = accs;
    const eoa = (taskArgs.account.length == 42) ? await ethers.getSigner(taskArgs.account) : accs[taskArgs.account];
    const gasTokenDeployment = await deployments.get("GasToken");
    const paymasterDeployment = await deployments.get("SimpleERC20Paymaster");
    const entryPointDeployment = await deployments.get("EntryPoint");
    const gasToken = (await ethers.getContractFactory("GasToken")).attach(gasTokenDeployment.address).connect(fundSrc);
    const entryPoint = (await ethers.getContractFactory("EntryPoint")).attach(entryPointDeployment.address);

    const fac = await ethers.getContractFactory("SimpleAccount");
    const callData = fac.interface.encodeFunctionData('execute', [acc1.address, 1, '0x'])

    const paymasterVerificationGasLimit = 150_000n;
    const paymasterPostOpGasLimit = 300_000n;
    const userop = await fillAndSign({
      sender: eoa.address,
      paymaster: ethers.utils.solidityPack(
        ["address", "uint128", "uint128", "bytes"],
        [paymasterDeployment.address, paymasterVerificationGasLimit, paymasterPostOpGasLimit, '0x'],
      ),
      initCode: '0x',
      nonce: 0,
      callData
    }, eoa, entryPoint);

    // const auth = await signEip7702Authorization(eoa, { chainId: 0, nonce: 0, address: eip7702delegate.address })

    const res = await entryPoint.handleOps([packUserOp(userop)], eoa.address);
    console.log('result', res);
  });
