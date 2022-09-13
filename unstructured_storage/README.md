# Upgradeability using unstructured storage

### 주요 컨트랙트
- OwnedUpgradeabilityProxy

### 패턴
```
const impl_v0 = await Token_V0.new()
const proxy = await OwnedUpgradeabilityProxy.new({ from: proxyOwner })
const initializeData = encodeCall('initialize', ['address'], [tokenOwner])
await proxy.upgradeToAndCall(impl_v0.address, initializeData, { from: proxyOwner })

const impl_v1 = await Token_V1.new() // 로직 컨트랙트
await proxy.upgradeTo(impl_v1.address, { from: proxyOwner })

this.token = await Token_V1.at(proxy.address) // abi를 갖고 있는 proxy 컨트랙트
```

This idea builds on _upgradeability using inherited storage_ but redefining the storage structure of the contracts
required for upgradeability purpose. The idea here is to use fixed storage slots to store the required data for
upgradeability purpose, this is the upgradeability owner and the implementation address.

We are using inline assembly to store and access mentioned variables in fixed storage positions indexing them
with custom keys using `keccak256`. Please take a look at the implementation provided in `UpgradeabilityProxy` 
and `OwnedUpgradeabilityProxy`.

This is the proposed model:

        -------                      ----------     ----------
       | Proxy |                    | Token_V0 | ← | Token_V1 |
        -------                      ----------     ----------
          ↑              
        --------------------- 
       | UpgradeabilityProxy |
        ---------------------    
          ↑                      
        -------------------------- 
       | OwnedUpgradeabilityProxy |            
        --------------------------        
