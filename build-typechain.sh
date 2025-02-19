#!/bin/bash
set -e

mkdir -p typechain/dist
touch typechain/dist/index.js

npx hardhat typechain
(cd typechain && npx tsc)

echo "Typechain build complete 🎉"