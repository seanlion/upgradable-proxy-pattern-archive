# Upgradeability using Inherited Storage

### 주요 컨트랙트
- UpgradeabilityProxy(흔히 얘기하는 Proxy Contract)
- Upgradeable

### 패턴
```
const impl_v1_0 = await TokenV1_0.new()
const impl_v1_1 = await TokenV1_1.new()

const registry = await Registry.new()
await registry.addVersion("1.0", impl_v1_0.address)
await registry.addVersion("1.1", impl_v1_1.address)
const {logs} = await registry.createProxy("1.0")
const {proxy} = logs.find(l => l.event === 'ProxyCreated').args

const token0 = await TokenV1_0.at(proxy);
await token0.mint(sender, 100)

const proxyCon = await Proxy.at(proxy);
await proxyCon.upgradeTo("1.1")

const token1 = await TokenV1_1.at(proxy);
await token1.mint(sender, 100);
```

---
The idea of this approach is to allow us to upgrade a contract's behavior, assuming that each version will follow the 
storage structure of the previous one. 

The approach consists in having a proxy that delegates calls to specific implementations which can be upgraded, without
changing the storage structure of the previous implementations, but having the chance to add new state variables. Given
the proxy uses `delegatecall` to resolve the requested behaviors, the upgradeable contract's state will be stored in 
the proxy contract itself. 

Since we have two really different kinds of data, one related to the upgradeability mechanism and another 
strictly related to the token contract domain, naming was really important here to expressed correctly what's 
going on. This is the proposed model:
            
                   -------             =========================
                  | Proxy |           ║  UpgradeabilityStorage  ║
                   -------             =========================
                      ↑                 ↑                     ↑            
                     ---------------------              -------------
                    | UpgradeabilityProxy |            | Upgradeable |
                     ---------------------              ------------- 
                                                          ↑        ↑
                                                  ----------      ---------- 
                                                 | Token_V0 |  ← | Token_V1 |         
                                                  ----------      ---------- 
                                          

`Proxy`, `UpgradeabilityProxy` and `UpgradeabilityStorage` are generic contracts that can be used to implement
upgradeability through proxies. In this example we use all these contracts to implement an upgradeable ERC20 token. 

`UpgradeabilityProxy` is the contract that will delegate calls to specific implementations of the ERC20 token behavior. 
These behaviors are the code that can be upgraded by the token developer (e.g. `Token_V0` and `Token_V1`). 

The `UpgradeabilityStorage` contract holds data needed for upgradeability, which will be inherited from each token
behavior though `Upgradeable`. Then, each token behavior defines all the necessary state variables to 
carry out their storage. Notice that `Token_V1` inherits the same storage structure defined in `Token_V0`. 
This is a requirement of the proposed approach to ensure the proxy storage is not messed up.
