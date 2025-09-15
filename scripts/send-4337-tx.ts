// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import * as hre from 'hardhat'
import { decodeRevertReason, getAccountInitCode } from '../test/testutils';
import { fillAndSign, packUserOp } from "../test/UserOp";

const aLittleEth = "0.001";

async function main() {
    const { deployments, ethers } = hre;
    const taskArgs = {
        account: 2
    }
    const accs = await ethers.getSigners();
    const [fundSrc] = accs;
    const eoa = new ethers.Wallet("...", ethers.provider);
    const bundler = new ethers.Wallet("...", ethers.provider);
    const gasTokenDeployment = await deployments.get("GasToken");
    const paymasterDeployment = await deployments.get("SimpleERC20Paymaster");
    const entryPointDeployment = await deployments.get("EntryPoint");
    const accfacd = await deployments.get("SimpleAccountFactory");
    const gasToken = (await ethers.getContractFactory("GasToken")).attach(gasTokenDeployment.address).connect(fundSrc);
    const entryPoint = (await ethers.getContractFactory("EntryPoint")).attach(entryPointDeployment.address);
    const fac = await ethers.getContractFactory("SimpleAccountFactory");
    const accountFactory = fac.attach(accfacd.address);
    
    const paymasterVerificationGasLimit = 150_000n;
    const paymasterPostOpGasLimit = 300_000n;
    const callGasLimit = 200_000n;
    const verificationGasLimit = 500_000n;
    const salt = 42;
    const expectedSmartAccountAddress = await accountFactory.getAddress(eoa.address, salt);
    console.log(eoa.address, "'s smart account is", expectedSmartAccountAddress);
    // const txFund = await fundSrc.sendTransaction({
    //     to: bundler.address,
    //     value: ethers.utils.parseEther(aLittleEth),
    // });
    // console.log('funded', aLittleEth, 'eth to bundler', bundler.address);
    // await txFund.wait();

    const callData = fac.interface.encodeFunctionData('createAccount', [eoa.address, salt]);

    const userop = await fillAndSign({
      sender: expectedSmartAccountAddress,
      callGasLimit,
      verificationGasLimit,
      paymaster: paymasterDeployment.address,
      paymasterVerificationGasLimit,
      paymasterPostOpGasLimit,
      paymasterData: '0x',
      initCode: getAccountInitCode(eoa.address, accountFactory, salt),
      nonce: 0,
      callData,
      maxPriorityFeePerGas: ethers.utils.parseUnits("0.001", "gwei"), // l2
      maxFeePerGas: ethers.utils.parseUnits("0.0015", "gwei"),
    }, eoa, entryPoint);

    // const handleOpCall = {
    //     from: eoa.address,
    //     to: entryPoint.address,
    //     data: entryPoint.interface.encodeFunctionData('handleOps', [[packUserOp(userop)], eoa.address]),
    //     gasLimit: 5000000,
    //     gasPrice: 10000000000,
    // };
    // const res = await ethers.provider.sendTransaction(await eoa.signTransaction(handleOpCall)).catch(e => {
    //     throw Error(decodeRevertReason(e)!)
    // })

    const res = await entryPoint.connect(bundler).handleOps([packUserOp(userop)], eoa.address, { gasLimit: 2000000, maxFeePerGas: ethers.utils.parseUnits("0.0001", "gwei"), maxPriorityFeePerGas: ethers.utils.parseUnits("0.0001", "gwei") });
    console.log('result', await res.wait());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
