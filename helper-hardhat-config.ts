type NetworkConfigItem = {
    name: string,
    fundAmount: bigint,
    fee?: string,
    keyHash?: string,
    interval?: string,
    linkToken?: string,
    vrfCoordinator?: string,
    keepersUpdateInterval?: string,
    oracle?: string,
    jobId?: string,
    usdtTokenAddress?: string,
    arbTokenAddress?: string,
    ethUsdPriceFeed?: string,
    arbUsdPriceFeed?: string,
    usdtUsdPriceFeed?: string,
    bridgedOriTokenAddress?: string,
    inboxAddress?: string,
}

type NetworkConfigMap = {
    [chainId: string]: NetworkConfigItem
}

export const networkConfig: NetworkConfigMap = {
    default: {
        name: "hardhat",
        fee: "100000000000000000",
        keyHash: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        jobId: "29fa9aa13bf1468788b7cc4a500a45b8",
        fundAmount: 1000000000000000000n,
        keepersUpdateInterval: "30",
    },
    31337: {
        name: "localhost",
        fee: "100000000000000000",
        keyHash: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        jobId: "29fa9aa13bf1468788b7cc4a500a45b8",
        fundAmount: 1000000000000000000n,
        keepersUpdateInterval: "30",
    },
    412346: {
        name: "nitro-localhost",
        fee: "100000000000000000",
        keyHash: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        jobId: "29fa9aa13bf1468788b7cc4a500a45b8",
        fundAmount: 1000000000000000000n,
        keepersUpdateInterval: "30",
    },
    11155111: {
        name: "sepolia",
        linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
        ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
        keyHash: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        vrfCoordinator: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        oracle: "0x6090149792dAAeE9D1D568c9f9a6F6B46AA29eFD",
        jobId: "ca98366cc7314957b8c012c72f05aeeb",
        fee: "100000000000000000",
        fundAmount: 100000000000000000n,
        keepersUpdateInterval: "30",
    },
    137: {
        name: "polygon",
        linkToken: "0xb0897686c545045afc77cf20ec7a532e3120e0f1",
        ethUsdPriceFeed: "0xF9680D99D6C9589e2a93a78A04A279e509205945",
        oracle: "0x0a31078cd57d23bf9e8e8f1ba78356ca2090569e",
        jobId: "12b86114fa9e46bab3ca436f88e1a912",
        fee: "100000000000000",
        fundAmount: 100000000000000n,
    },
    421613: {
        name: 'arbitrumGoerli',
        usdtTokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        arbTokenAddress: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
        ethUsdPriceFeed: '0x62CAe0FA2da220f43a51F86Db2EDb36DcA9A5A08',
        usdtUsdPriceFeed: '0x0a023a3423D9b27A0BE48c768CCF2dD7877fEf5E',
        arbUsdPriceFeed: '0x2eE9BFB2D319B31A573EA15774B755715988E99D',
        fundAmount: 0n,
        bridgedOriTokenAddress: "0x20D2a2bA2CadA0cD89ca8d23d9a1AF95f5cc3A77",
    },
    5: {
        name: 'goerli',
        usdtTokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        arbTokenAddress: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
        ethUsdPriceFeed: '0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e',
        usdtUsdPriceFeed: '0xAb5c49580294Aff77670F839ea425f5b78ab3Ae7', // this is actually usdc
        arbUsdPriceFeed: '0xAb5c49580294Aff77670F839ea425f5b78ab3Ae7', // this is actually usdc
        fundAmount: 0n,
        inboxAddress: "0x0484A87B144745A2E5b7c359552119B6EA2917A9",
    },
    1: {
        name: "mainnet",
        linkToken: "0x514910771af9ca656af840dff83e8264ecf986ca",
        fundAmount: 0n,
        keepersUpdateInterval: "30",
        usdtTokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        ethUsdPriceFeed: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
        usdtUsdPriceFeed: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
        inboxAddress: '0x1c479675ad559DC151F6Ec7ed3FbF8ceE79582B6'
    },
    42161: {
        name: "arbitrum",
        linkToken: "0x514910771af9ca656af840dff83e8264ecf986ca",
        fundAmount: 0n,
        keepersUpdateInterval: "30",
        usdtTokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        arbTokenAddress: '0x912CE59144191C1204E64559FE8253a0e49E6548',
        ethUsdPriceFeed: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
        usdtUsdPriceFeed: '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7',
        arbUsdPriceFeed: '0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6',
    },
}

export const developmentChains: string[] = ["hardhat", "localhost", "nitro-localhost"]
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6
