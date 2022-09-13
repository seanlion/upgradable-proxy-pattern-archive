# Upgradeability using Eternal Storage

### 주요 컨트랙트 
- EternalStorageProxy
- OwnedUpgradeabilityProxy
- Proxy

### 패턴
- StorageProxy를 먼저 배포한 다음, impl 컨트랙트를 배포하고, StorageProxy에서 upgrade를 호출해서 버전을 등록한다.
```
const proxy = await EternalStorageProxy.new({ from: proxyOwner })

const impl_v0 = await Token_V0.new()
await proxy.upgradeTo('0', impl_v0.address, { from: proxyOwner })

const impl_v1 = await Token_V1.new()
const methodId = abi.methodID('initialize', ['address']).toString('hex');
const params = abi.rawEncode(['address'], [tokenOwner]).toString('hex');
const initializeData = '0x' + methodId + params;
await proxy.upgradeToAndCall('1', impl_v1.address, initializeData, { from: proxyOwner })
```

---
The idea of this approach is to allow us to upgrade a contract's behavior, using the same generic storage structure 
for any contract. This is a set of mappings for each type variable which could be accessed or modified inside the 
upgradeable contract. Notice that the contract developer should work only following this storage structure of mappings.

The approach consists in having a proxy that delegates calls to specific implementations which can be upgraded,
leaving the storage structure immutable. Given the proxy uses `delegatecall` to resolve the requested behaviors,
the upgradeable contract's state will be stored in the proxy contract itself.
The upgradeable contract can be initialized only once by a contract owner.

Since we have two really different kinds of data, one related to the upgradeability mechanism and another
strictly related to the token contract domain, naming was really important here to expressed correctly what's
going on. This is the proposed model:

     =========================     ============================     -------     =======================
    ║      EternalStorage     ║   ║ UpgradeabilityOwnerStorage ║   | Proxy |   ║ UpgradeabilityStorage ║
     =========================     ============================     -------     =======================
              ↑          ↑                            ↑                ↑            ↑
              |          |                            |            ---------------------
          ----------     |                            |           | UpgradeabilityProxy |
         | Token_V0 |    |                            |            ---------------------
          ----------     |                            |               ↑
              ↑          |                       --------------------------
              |          |                      | OwnedUpgradeabilityProxy |
          ----------     |                       --------------------------
         | Token_V1 |    |                          ↑
          ----------     |________ ---------------------
                                  | EternalStorageProxy |
                                   ---------------------

`Proxy`, `UpgradeabilityProxy` and `UpgradeabilityStorage` are generic contracts that can be used to implement
upgradeability through proxies. In this example we use all these contracts to implement an upgradeable ERC20 token. 

The `UpgradeabilityStorage` contract holds data needed for upgradeability, while the `UpgradeabilityOwnerStorage`
provides the required state variables to track upgradeability ownership. `EternalStorage` defines the generic storage
structure, which in this example will be used to store token specific data.

The `OwnedUpgradeabilityProxy` combines proxy, upgradeability and ownable functionalities restricting version upgrade
functions to be accessible just from the declared proxy owner.

`EternalStorageProxy` is the contract that will delegate calls to specific implementations of the ERC20 token behavior.
These behaviors are the code that can be upgraded by the token developer (e.g. `Token_V0` and `Token_V1`).
`EternalStorageProxy` extends from the `EternalStorage` contract, and then from `OwnedUpgradeabilityProxy` (which in
turn extends from `UpgradeabilityStorage` and `UpgradeabilityOwnerStorage`). Notice that `EternalStorageProxy` must
inherit from `EternalStorage` first to ensure that the storage structure lines up with contracts only inheriting from
`EternalStorage`.

In addition, we are not defining any new state variables in the token behavior implementation contracts, we are just
using the generic storage structure. This is a requirement of the proposed approach to ensure the proxy storage 
is not messed up.
