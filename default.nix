{ bun2nix, ... }:
bun2nix.mkDerivation {
  packageJson = ./package.json;

  src = ./.;
  module = "src/main.ts";

  bunDeps = bun2nix.fetchBunDeps {
    bunNix = ./bun.nix;
  };
}
