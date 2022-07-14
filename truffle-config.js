module.exports = {
  networks: {
    develop: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },
    loc_development_development: {
      network_id: "*",
      port: 8545,
      host: "127.0.0.1",
    },
    development: {
      network_id: "*",
      port: 8545,
      host: "127.0.0.1",
    },
  },
  mocha: {},
  compilers: {
    solc: {
      version: "0.8.11",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
};
