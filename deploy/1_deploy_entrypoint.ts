import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'

const deployEntryPoint: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const provider = ethers.provider
  const from = await provider.getSigner(0).getAddress();
  console.log("deployer is", from)
  const deployerSigner = provider.getSigner(0)

  const ret = await hre.deployments.deploy(
    'EntryPoint', {
      from,
      args: [],
      gasLimit: 6e6,
      deterministicDeployment: process.env.SALT ?? true,
      log: true
    })
  console.log('==entrypoint addr=', ret.address);

  const gtDeployResult = await hre.deployments.deploy(
    'GasToken', {
      from,
      args: [],
      deterministicDeployment: false,
      log: true
    });
  console.log('==gastoken addr=', gtDeployResult.address);

  const pmDeployResult = await hre.deployments.deploy(
    'ERC20Paymaster', {
      from,
      args: [ret.address, gtDeployResult.address],
      deterministicDeployment: false,
      log: true
    });
  
  const res = await hre.deployments.execute('ERC20Paymaster', {
    from,
    to: pmDeployResult.address,
    value: ethers.utils.parseEther('0.001'),
  }, 'deposit');

  console.log('==paymaster addr=', pmDeployResult.address, "with deposited balance (going to entry point)", await provider.getBalance(ret.address));
}

deployEntryPoint.tags = ["1"];

export default deployEntryPoint
