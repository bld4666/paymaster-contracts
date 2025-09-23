// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { BigNumber } from 'ethers';
import * as hre from 'hardhat'
import { decodeRevertReason, getAccountInitCode } from '../test/testutils';
import { fillAndSign, packUserOp, packUserOpHex } from "../test/UserOp";

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
    const paymasterDeployment = await deployments.get("ERC20Paymaster");
    const entryPointDeployment = await deployments.get("EntryPoint");
    const accfacd = await deployments.get("SimpleAccountFactory");
    const gasToken = (await ethers.getContractFactory("GasToken")).attach(gasTokenDeployment.address).connect(fundSrc);
    const entryPoint = (await ethers.getContractFactory("EntryPoint")).attach(entryPointDeployment.address);
    const fac = await ethers.getContractFactory("SimpleAccountFactory");
    const accountFactory = fac.attach(accfacd.address);
    
    const preVerificationGas = 1_000_000n;
    const paymasterVerificationGasLimit = 100_000n;
    const paymasterPostOpGasLimit = 100_000n;
    const callGasLimit = 200_000n;
    const verificationGasLimit = 500_000n;
    const salt = 42;
    const expectedSmartAccountAddress = await accountFactory.getAddress(eoa.address, salt);
    console.log(eoa.address, "'s smart account is", expectedSmartAccountAddress);

    const smartAcc = (await ethers.getContractFactory('SimpleAccount')).attach(expectedSmartAccountAddress);
    const exe = gasToken.interface.encodeFunctionData('transfer', [eoa.address, ethers.utils.parseEther(aLittleEth)]);
    const { data: callData } = await smartAcc.populateTransaction.execute(gasToken.address, '0', exe);

    const userop = await fillAndSign({
      sender: expectedSmartAccountAddress,
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      paymaster: paymasterDeployment.address,
      paymasterVerificationGasLimit,
      paymasterPostOpGasLimit,
      paymasterData: '0x',
      initCode: '0x', // getAccountInitCode(eoa.address, accountFactory, salt),
      nonce: 1,
      callData,
      maxPriorityFeePerGas: ethers.utils.parseUnits("0.001", "gwei"), // l2
      maxFeePerGas: ethers.utils.parseUnits("0.0015", "gwei"),
    }, eoa, entryPoint);

    const prov = new ethers.providers.JsonRpcProvider('http://localhost:3000/rpc');
    const userOpHash = await prov.send('eth_sendUserOperation', [packUserOpHex(userop), entryPoint.address]);
    console.log('userOpHash', userOpHash);
    const rc = await prov.send('eth_getUserOperationReceipt', [userOpHash]);
    console.log('receipt', rc);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
