const TokenV1_0 = artifacts.require('TokenV1_0')
const TokenV1_1 = artifacts.require('TokenV1_1')

const Registry = artifacts.require('Registry')
const Proxy = artifacts.require('UpgradeabilityProxy')

contract('Upgradeable', function ([sender, receiver]) {

  it('should work', async function () {
    const impl_v1_0 = await TokenV1_0.new()
    const impl_v1_1 = await TokenV1_1.new()

    const registry = await Registry.new()
    await registry.addVersion("1.0", impl_v1_0.address)
    await registry.addVersion("1.1", impl_v1_1.address)
    // UpgradeabilityProxy를 만듬. "1.0"에 해당하는 _implementation address를 넣음.
    const {logs} = await registry.createProxy("1.0")

    const {proxy} = logs.find(l => l.event === 'ProxyCreated').args
    console.log("proxy address : ", proxy);
    // 이 UpgradeabilityProxy 주소와 token0, token1의 주소는 같다.
    const token0 = await TokenV1_0.at(proxy);
    console.log("token v0 contract address : ", token0.address);
    console.log("token v0 contract methods : ", token0.contract.methods);
    await token0.mint(sender, 100)
    // Storage에 있는 _implementation의 내용을 갱신
    const proxyCon = await Proxy.at(proxy);
    console.log("proxyCon contract address :" , proxyCon.address);
    console.log("proxyCon contract methods : ", proxyCon.contract.methods);
    await proxyCon.upgradeTo("1.1")

    const token1 = await TokenV1_1.at(proxy);
    console.log("token v1 contract address : ", token1.address);
    console.log("token v1 contract methods : ", token1.contract.methods);
    await token1.mint(sender, 100);

    const transferTx = await token1.transfer(receiver, 10, { from: sender })

    console.log("Transfer TX gas cost using Inherited Storage Proxy", transferTx.receipt.gasUsed);

    const balance = await token1.balanceOf(sender);
    console.log(" balance : ", balance);

  })

})
