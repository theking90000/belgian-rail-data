{
  description = "SNCB Insights - Belgian Rail Data analytics & tracking";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    bun2nix = {
      url = "github:nix-community/bun2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, bun2nix }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ bun2nix.overlays.default ];
        };
        pname = "sncb-insights";
        version = "2.0.0";
      in
      {
        packages.default = pkgs.bun2nix.mkDerivation {
          inherit pname version;

          src = pkgs.lib.cleanSourceWith {
            src = ./.;
            filter = path: type:
              let baseName = builtins.baseNameOf path;
              in !(builtins.elem baseName [
                "node_modules"
                "target"
                "cache"
                ".git"
                ".gitignore"
                "brd.db"
                "brd.db-shm"
                "brd.db-wal"
                "config.db"
                "data.db"
                "logs.db"
                "tracked.json"
                "default.nix"
                "node-env.nix"
                "node-packages.nix"
                "yarn.lock"
                "package-lock.json"
              ]);

            # Keep: src/, package.json, bun.lock, bun.nix, tsconfig.json, build.sh, install.sh
          };

          bunDeps = pkgs.bun2nix.fetchBunDeps {
            bunNix = ./bun.nix;
            autoPatchElf = pkgs.stdenv.hostPlatform.isLinux;
            nativeBuildInputs = with pkgs; [ sqlite ];
          };

          module = "src/main.ts";

          bunCompileToBytecode = false;

          nativeBuildInputs = with pkgs; [
            python3
            gcc
            gnumake
            pkg-config
          ];

          buildInputs = with pkgs; [
            sqlite
          ];

          meta = with pkgs.lib; {
            description = "Belgian Rail Data analytics and tracking";
            homepage = "https://github.com/anomalyco/sncb-insights";
            license = licenses.mit;
            mainProgram = "sncb-insights";
            platforms = platforms.linux ++ platforms.darwin;
          };
        };

        packages.sncb-insights = self.packages.${system}.default;

        devShells.default = pkgs.mkShell {
          name = "${pname}-devshell";

          nativeBuildInputs = with pkgs; [
            gcc
            python3
            pkg-config
            gnumake
          ];

          packages = with pkgs; [
            bun
            bun2nix.packages.${system}.default
            sqlite
          ];

          npm_config_build_from_source = "true";

          shellHook = ''
            echo "=== SNCB Insights Development Shell ==="
            echo "  bun install      - install deps + regenerate bun.nix"
            echo "  bun run start    - run the application"
            echo "  nix build .#     - build the Nix package"
            echo "  nix run .# -- --server  - run via Nix"
          '';
        };

        apps.default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/sncb-insights";
        };

        apps.sncb-insights = self.apps.${system}.default;
      }
    );
}
