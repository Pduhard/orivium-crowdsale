import { task } from "hardhat/config"

task("orivium:addresses", "Récupère les adresses des contrats déployés")
  .setAction(async (_, hre) => {
    Object.entries(await hre.deployments.all())
      .forEach(([k, v]) => {
        console.log(k, v.address);
      }
    );
});