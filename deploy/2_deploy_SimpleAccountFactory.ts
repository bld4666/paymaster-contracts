import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'

const deploySimpleAccountFactory: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const provider = ethers.provider
  const from = await provider.getSigner().getAddress()
  const network = await provider.getNetwork()

  // const forceDeployFactory = process.argv.join(' ').match(/simple-account-factory/) != null

  // if (!forceDeployFactory && network.chainId !== 31337 && network.chainId !== 1337) {
  //   return
  // }

  const entrypoint = await hre.deployments.get('EntryPoint');
  const pm = await hre.deployments.get('SimpleERC20Paymaster');
  const gt = await hre.deployments.get('GasToken');
  await hre.deployments.deploy(
    'SimpleAccountFactory', {
      from,
      args: [entrypoint.address, pm.address],
      gasLimit: 6e6,
      log: true,
      deterministicDeployment: true
    })

  // const userWalletSigner = provider.getSigner(2);
  // const salt = 42;
  // const newAddr = await hre.deployments.read('SimpleAccountFactory', { from: from }, 'getAddress', await userWalletSigner.getAddress(), salt);
  // console.log("smart wallet address", newAddr);
  // const res = await hre.deployments.execute('SimpleAccountFactory', { from: from }, 'createAccount', await userWalletSigner.getAddress(), salt);

}

deploySimpleAccountFactory.tags = ["2"];

export default deploySimpleAccountFactory
